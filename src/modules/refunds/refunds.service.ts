import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { RefundRequest, RefundStatus } from '../../database/entities/refund-request.entity';
import { Enrollment } from '../../database/entities/enrollment.entity';
import { Wallet } from '../../database/entities/wallet.entity';
import { Transaction } from '../../database/entities/transaction.entity';
import { CreateRefundRequestDto } from './dto/create-refund-request.dto';
import { ProcessRefundDto } from './dto/process-refund.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../database/entities/notification.entity';
import { User } from '../../database/entities/user.entity';

@Injectable()
export class RefundsService {
  constructor(
    @InjectRepository(RefundRequest)
    private refundRequestsRepo: Repository<RefundRequest>,
    @InjectRepository(Enrollment)
    private enrollmentsRepo: Repository<Enrollment>,
    @InjectRepository(Wallet)
    private walletsRepo: Repository<Wallet>,
    @InjectRepository(Transaction)
    private transactionsRepo: Repository<Transaction>,
    private dataSource: DataSource,
    private notificationsService: NotificationsService,
  ) {}

  async requestRefund(userId: number, dto: CreateRefundRequestDto) {
    const enrollment = await this.enrollmentsRepo.findOne({
      where: { id: dto.enrollmentId, student_id: userId },
      relations: ['course', 'order_item'],
    });

    if (!enrollment) {
      throw new NotFoundException('Không tìm thấy thông tin đăng ký khóa học');
    }

    if (!enrollment.is_active) {
      throw new BadRequestException('Khóa học này đã bị khóa hoặc đã được hoàn tiền');
    }

    // ── Rule 30/30 Check ──
    const now = new Date();
    const enrolledAt = new Date(enrollment.enrolled_at);
    const diffTime = Math.abs(now.getTime() - enrolledAt.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 30) {
      throw new BadRequestException('Đã quá hạn 30 ngày để yêu cầu hoàn tiền');
    }

    if (enrollment.progress_percent > 30) {
      throw new BadRequestException(`Tiến độ học tập hiện tại là ${enrollment.progress_percent}%, vượt quá mức cho phép (30%) để hoàn tiền`);
    }

    // Check if a request already exists
    const existing = await this.refundRequestsRepo.findOne({
      where: { enrollment_id: dto.enrollmentId, status: RefundStatus.PENDING },
    });
    if (existing) {
      throw new BadRequestException('Bạn đã gửi yêu cầu hoàn tiền cho khóa học này và đang chờ duyệt');
    }

    const refundRequest = this.refundRequestsRepo.create({
      enrollment_id: dto.enrollmentId,
      student_id: userId,
      course_id: enrollment.course_id,
      amount: enrollment.order_item.final_price,
      reason: dto.reason,
      bank_name: dto.bankName,
      bank_account_number: dto.bankAccountNumber,
      bank_account_name: dto.bankAccountName,
      status: RefundStatus.PENDING,
    });

    await this.refundRequestsRepo.save(refundRequest);
    
    // 1. Notify Student
    await this.notificationsService.sendNotification(
      userId,
      NotificationType.ENROLLMENT,
      'Yêu cầu hoàn tiền đã được gửi',
      `Yêu cầu hoàn tiền cho khóa học "${enrollment.course.title}" của bạn đã được gửi thành công và đang chờ xử lý.`,
      { refundId: refundRequest.id },
    );

    // 2. Notify Admins and Staff
    const staff = await this.dataSource.manager.find(User, {
      where: { role: { roleName: In(['ADMIN', 'STAFF']) } },
      relations: ['role'],
    });

    for (const member of staff) {
      await this.notificationsService.sendNotification(
        member.id,
        NotificationType.SYSTEM,
        'Yêu cầu hoàn tiền mới',
        `Học viên vừa yêu cầu hoàn tiền cho khóa học "${enrollment.course.title}".`,
        { refundId: refundRequest.id },
      );
    }

    return refundRequest;
  }

  async getRefundRequests(status?: RefundStatus) {
    return this.refundRequestsRepo.find({
      where: status ? { status } : {},
      order: { created_at: 'DESC' },
      relations: ['student', 'course', 'enrollment'],
    });
  }

  async processRefund(adminId: number, requestId: number, dto: ProcessRefundDto) {
    const refundRequest = await this.refundRequestsRepo.findOne({
      where: { id: requestId },
      relations: ['enrollment', 'enrollment.order_item', 'enrollment.course', 'student', 'course'],
    });

    if (!refundRequest) throw new NotFoundException('Không tìm thấy yêu cầu hoàn tiền');
    if (refundRequest.status !== RefundStatus.PENDING) {
      throw new BadRequestException('Yêu cầu này đã được xử lý trước đó');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      refundRequest.status = dto.status;
      refundRequest.admin_note = dto.adminNote ?? null;
      refundRequest.processed_by_id = adminId;
      refundRequest.processed_at = new Date();
      await queryRunner.manager.save(refundRequest);

      if (dto.status === RefundStatus.APPROVED) {
        // 1. Revoke access
        const enrollment = refundRequest.enrollment;
        enrollment.is_active = false;
        enrollment.revoked_at = new Date();
        enrollment.revoke_reason = 'REFUNDED: ' + (dto.adminNote || 'No reason provided');
        await queryRunner.manager.save(enrollment);

        // 2. Adjust Instructor Wallet
        const instructorId = enrollment.order_item.instructor_id;
        const instructorAmount = Number(enrollment.order_item.instructor_amount);
        
        const wallet = await queryRunner.manager.findOne(Wallet, {
          where: { user_id: instructorId },
        });

        if (wallet) {
          // Subtract from pending and total earned
          wallet.balance_pending = Number(wallet.balance_pending) - instructorAmount;
          wallet.total_earned = Number(wallet.total_earned) - instructorAmount;
          await queryRunner.manager.save(wallet);

          // Find the original EARNING transaction to cancel it if it's still locked
          const originalTx = await queryRunner.manager.findOne(Transaction, {
            where: { 
              order_item_id: enrollment.order_item_id, 
              transaction_type: 'EARNING',
              status: 'LOCKED'
            }
          });

          if (originalTx) {
            originalTx.status = 'CANCELLED';
            await queryRunner.manager.save(originalTx);
          }

          // Total balance after deduction for audit
          const totalBalanceAfter = Number(wallet.balance_available) + Number(wallet.balance_pending);

          // Create REFUND transaction for instructor record
          const refundTx = queryRunner.manager.create(Transaction, {
            wallet_id: wallet.id,
            order_item_id: enrollment.order_item_id,
            transaction_type: 'REFUND',
            amount: -instructorAmount,
            status: 'AVAILABLE',
            balance_after: totalBalanceAfter,
          });
          await queryRunner.manager.save(refundTx);
        }
      }

      await queryRunner.commitTransaction();

      // Notifications
      if (dto.status === RefundStatus.APPROVED) {
        await this.notificationsService.sendNotification(
          refundRequest.student_id,
          NotificationType.ORDER,
          'Hoàn tiền thành công',
          `Yêu cầu hoàn tiền khóa học "${refundRequest.course.title}" đã được chấp nhận. Tiền sẽ được chuyển về tài khoản của bạn sớm.`,
          { refundId: refundRequest.id },
        );

        // Notify instructor about the deduction
        await this.notificationsService.sendNotification(
          refundRequest.enrollment.order_item.instructor_id,
          NotificationType.WALLET,
          'Khấu trừ hoàn tiền',
          `Yêu cầu hoàn tiền của học viên cho khóa học "${refundRequest.course.title}" đã được duyệt. Số dư treo của bạn đã bị khấu trừ.`,
          { refundId: refundRequest.id },
        );
      } else {
        await this.notificationsService.sendNotification(
          refundRequest.student_id,
          NotificationType.ORDER,
          'Yêu cầu hoàn tiền bị từ chối',
          `Yêu cầu hoàn tiền khóa học "${refundRequest.course.title}" bị từ chối. Lý do: ${dto.adminNote}`,
          { refundId: refundRequest.id },
        );
      }

      return refundRequest;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getMyRefunds(userId: number) {
    return this.refundRequestsRepo.find({
      where: { student_id: userId },
      order: { created_at: 'DESC' },
      relations: ['course'],
    });
  }
}
