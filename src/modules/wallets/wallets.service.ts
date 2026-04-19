import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThanOrEqual, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as ExcelJS from 'exceljs';
import { Wallet } from '../../database/entities/wallet.entity';
import { Transaction } from '../../database/entities/transaction.entity';
import { Payout, PayoutStatus } from '../../database/entities/payout.entity';
import { RequestPayoutDto } from './dto/request-payout.dto';
import { ProcessPayoutDto } from './dto/process-payout.dto';
import { User } from '../../database/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../database/entities/notification.entity';

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet) private walletsRepo: Repository<Wallet>,
    @InjectRepository(Transaction)
    private transactionsRepo: Repository<Transaction>,
    @InjectRepository(Payout) private payoutsRepo: Repository<Payout>,
    private dataSource: DataSource,
    private notificationsService: NotificationsService,
  ) {}

  async getMyWallet(userId: number) {
    let wallet = await this.walletsRepo.findOne({ where: { user_id: userId } });
    if (!wallet) {
      wallet = this.walletsRepo.create({
        user_id: userId,
        balance_pending: 0,
        balance_available: 0,
        total_earned: 0,
      });
      await this.walletsRepo.save(wallet);
    }
    return wallet;
  }

  async getTransactionHistory(userId: number) {
    const wallet = await this.getMyWallet(userId);
    return this.transactionsRepo.find({
      where: { wallet_id: wallet.id },
      order: { created_at: 'DESC' },
      relations: [
        'order_item',
        'order_item.course',
        'order_item.order',
        'order_item.order.student',
      ],
    });
  }

  async getMasterLedger(query: {
    status?: string;
    type?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, type, search, page = 1, limit = 50 } = query;
    const qb = this.transactionsRepo
      .createQueryBuilder('tx')
      .leftJoinAndSelect('tx.wallet', 'wallet')
      .leftJoinAndSelect('wallet.user', 'user')
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('tx.order_item', 'order_item')
      .leftJoinAndSelect('order_item.course', 'course')
      .leftJoinAndSelect('order_item.order', 'order')
      .orderBy('tx.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      qb.andWhere('tx.status = :status', { status });
    }
    if (type) {
      qb.andWhere('tx.transaction_type = :type', { type });
    }
    if (search) {
      qb.andWhere(
        '(tx.id::text = :search OR order.order_number ILIKE :searchLike)',
        {
          search: search.replace('TX-', ''),
          searchLike: `%${search}%`,
        },
      );
    }

    const [items, total] = await qb.getManyAndCount();

    // Calculate Master Stats (Simple aggregation)
    const stats = await this.transactionsRepo.query(`
      SELECT 
        SUM(CASE WHEN transaction_type = 'PURCHASE' AND status != 'CANCELLED' THEN amount ELSE 0 END) as gross_revenue,
        SUM(CASE WHEN transaction_type = 'WITHDRAWAL' AND status = 'COMPLETED' THEN ABS(amount) ELSE 0 END) as total_payouts,
        SUM(CASE WHEN transaction_type = 'PLATFORM_FEE' AND status != 'CANCELLED' THEN amount ELSE 0 END) as total_commissions
      FROM transactions
    `);

    return {
      items,
      total,
      stats: stats[0],
    };
  }

  async requestPayout(userId: number, dto: RequestPayoutDto) {
    const wallet = await this.getMyWallet(userId);

    if (Number(wallet.balance_available) < dto.amount) {
      throw new BadRequestException('Số dư khả dụng không đủ');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Create payout request
      const payout = queryRunner.manager.create(Payout, {
        instructorId: userId,
        amount: dto.amount,
        bankAccountName: dto.bankAccountName,
        bankAccountNumber: dto.bankAccountNumber,
        bankName: dto.bankName,
        status: PayoutStatus.PENDING,
      });
      await queryRunner.manager.save(payout);

      // 2. Adjust wallet balance
      wallet.balance_available = Number(wallet.balance_available) - dto.amount;
      await queryRunner.manager.save(wallet);

      // 3. Log transaction
      const transaction = queryRunner.manager.create(Transaction, {
        wallet_id: wallet.id,
        transaction_type: 'WITHDRAWAL',
        amount: -dto.amount,
        status: 'AVAILABLE',
        balance_after: Number(wallet.balance_available) + Number(wallet.balance_pending),
      });
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      // Notify admin about new payout request
      const admins = await this.dataSource.manager.find(User, {
        where: { role: { roleName: 'ADMIN' } },
        relations: ['role'],
      });
      const amountFormatted = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(dto.amount);
      for (const admin of admins) {
        await this.notificationsService.sendNotification(
          admin.id,
          NotificationType.WALLET,
          'Yêu cầu rút tiền mới',
          `Có yêu cầu rút tiền ${amountFormatted} từ Giảng viên. Vui lòng kiểm tra đối soát.`,
          { payoutId: payout.id, amount: dto.amount },
        );
      }

      return payout;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getPayoutRequests(status?: PayoutStatus) {
    return this.payoutsRepo.find({
      where: status ? { status } : {},
      order: { requestedAt: 'DESC' },
      relations: ['instructor'],
    });
  }

  async getMyPayouts(userId: number) {
    return this.payoutsRepo.find({
      where: { instructorId: userId },
      order: { requestedAt: 'DESC' },
    });
  }

  async processPayout(payoutId: number, dto: ProcessPayoutDto) {
    const payout = await this.payoutsRepo.findOne({
      where: { id: payoutId },
      relations: ['instructor'],
    });

    if (!payout) throw new NotFoundException('Không tìm thấy yêu cầu rút tiền');
    if (payout.status !== PayoutStatus.PENDING) {
      throw new BadRequestException('Yêu cầu này đã được xử lý');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      payout.status = dto.status;
      payout.adminNote = dto.adminNote || null;
      payout.processedAt = new Date();
      await queryRunner.manager.save(payout);

      if (dto.status === PayoutStatus.REJECTED) {
        // Refund back to available balance
        const wallet = await queryRunner.manager.findOne(Wallet, {
          where: { user_id: payout.instructorId },
        });
        if (wallet) {
          wallet.balance_available =
            Number(wallet.balance_available) + Number(payout.amount);
          await queryRunner.manager.save(wallet);

          // Log refund transaction
          const transaction = queryRunner.manager.create(Transaction, {
            wallet_id: wallet.id,
            transaction_type: 'REFUND',
            amount: Number(payout.amount),
            status: 'AVAILABLE',
            balance_after: Number(wallet.balance_available) + Number(wallet.balance_pending),
          });
          await queryRunner.manager.save(transaction);
        }
      }

      await queryRunner.commitTransaction();

      // Notify instructor about payout result
      const amountFormatted = new Intl.NumberFormat('vi-VN', {
        style: 'currency', currency: 'VND',
      }).format(Number(payout.amount));

      if (dto.status === PayoutStatus.COMPLETED) {
        await this.notificationsService.sendNotification(
          payout.instructorId,
          NotificationType.WALLET,
          'Giải ngân thành công!',
          `Yêu cầu rút tiền REQ-${payout.id} đã thành công. ${amountFormatted} đã được chuyển vào tài khoản ${payout.bankAccountNumber}.`,
          { payoutId: payout.id },
        );
      } else if (dto.status === PayoutStatus.REJECTED) {
        await this.notificationsService.sendNotification(
          payout.instructorId,
          NotificationType.WALLET,
          'Yêu cầu rút tiền bị từ chối',
          `Yêu cầu rút tiền bị từ chối. Lý do: ${dto.adminNote || 'Không rõ'}. Vui lòng kiểm tra lại thông tin ngân hàng.`,
          { payoutId: payout.id },
        );
      }

      return payout;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async releaseLockedTransactions() {
    const now = new Date();
    const lockedTransactions = await this.transactionsRepo.find({
      where: {
        status: 'LOCKED',
        locked_until: LessThanOrEqual(now),
      },
      relations: ['wallet'],
    });

    for (const tx of lockedTransactions) {
      const wallet = tx.wallet;
      tx.status = 'AVAILABLE';
      tx.released_at = now;

      wallet.balance_pending = Number(wallet.balance_pending) - Number(tx.amount);
      wallet.balance_available =
        Number(wallet.balance_available) + Number(tx.amount);

      await this.dataSource.transaction(async (manager) => {
        await manager.save(tx);
        await manager.save(wallet);
      });
    }

    console.log(`Released ${lockedTransactions.length} transactions`);
  }

  async exportPayouts(ids: number[]): Promise<ExcelJS.Buffer> {
    const payouts = await this.payoutsRepo.find({
      where: { id: In(ids) },
      relations: ['instructor', 'instructor.profile'],
    });

    if (!payouts.length) {
      throw new NotFoundException('Không tìm thấy phiếu rút tiền nào');
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Danh sách chi trả');

    sheet.columns = [
      { header: 'Payout ID', key: 'payoutId', width: 15 },
      { header: 'Tên Giảng Viên', key: 'instructorName', width: 30 },
      { header: 'Số Tài Khoản', key: 'bankAccountNumber', width: 25 },
      { header: 'Ngân Hàng', key: 'bankName', width: 20 },
      { header: 'Chủ Tài Khoản', key: 'bankAccountName', width: 30 },
      { header: 'Số Tiền', key: 'amount', width: 20 },
      { header: 'Nội dung chuyển khoản', key: 'transferNote', width: 35 },
    ];

    // Style header
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, size: 12 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF000000' },
      };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    });

    for (const po of payouts) {
      sheet.addRow({
        payoutId: `PO-${po.id}`,
        instructorName: po.instructor?.profile?.fullName || po.bankAccountName,
        bankAccountNumber: po.bankAccountNumber,
        bankName: po.bankName,
        bankAccountName: po.bankAccountName,
        amount: Number(po.amount),
        transferNote: `StudyMate Payout PO-${po.id}`,
      });
    }

    return workbook.xlsx.writeBuffer();
  }

  async reconcilePayouts(
    csvContent: string,
  ): Promise<{ processed: number; success: number; failed: number; errors: string[] }> {
    const lines = csvContent.trim().split('\n');
    const results = { processed: 0, success: 0, failed: 0, errors: [] as string[] };

    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim());
      if (cols.length < 2) continue;

      // Extract payout ID from "PO-123" format
      const rawId = cols[0].replace('PO-', '').replace('"', '').replace('"', '');
      const payoutId = parseInt(rawId, 10);
      const status = cols[1].toUpperCase();
      const note = cols[2] || '';

      if (isNaN(payoutId)) {
        results.errors.push(`Dòng ${i + 1}: ID không hợp lệ "${cols[0]}"`);
        continue;
      }

      const payout = await this.payoutsRepo.findOne({
        where: { id: payoutId },
      });

      if (!payout) {
        results.errors.push(`Dòng ${i + 1}: Không tìm thấy PO-${payoutId}`);
        continue;
      }

      if (payout.status !== PayoutStatus.PENDING) {
        results.errors.push(`Dòng ${i + 1}: PO-${payoutId} đã được xử lý`);
        continue;
      }

      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        if (status === 'SUCCESS' || status === 'COMPLETED') {
          payout.status = PayoutStatus.COMPLETED;
          payout.adminNote = note || 'Đối soát tự động: Thành công';
          payout.processedAt = new Date();
          await queryRunner.manager.save(payout);
          results.success++;
        } else if (status === 'FAILED' || status === 'REJECTED') {
          payout.status = PayoutStatus.REJECTED;
          payout.adminNote = note || 'Đối soát tự động: Thất bại';
          payout.processedAt = new Date();
          await queryRunner.manager.save(payout);

          // Refund balance
          const wallet = await queryRunner.manager.findOne(Wallet, {
            where: { user_id: payout.instructorId },
          });
          if (wallet) {
            wallet.balance_available =
              Number(wallet.balance_available) + Number(payout.amount);
            await queryRunner.manager.save(wallet);

            const refundTx = queryRunner.manager.create(Transaction, {
              wallet_id: wallet.id,
              transaction_type: 'REFUND',
              amount: Number(payout.amount),
              status: 'AVAILABLE',
              balance_after: Number(wallet.balance_available) + Number(wallet.balance_pending),
            });
            await queryRunner.manager.save(refundTx);
          }
          results.failed++;
        } else {
          results.errors.push(
            `Dòng ${i + 1}: Trạng thái không hợp lệ "${status}"`,
          );
          await queryRunner.rollbackTransaction();
          await queryRunner.release();
          continue;
        }

        await queryRunner.commitTransaction();
        results.processed++;
      } catch (err) {
        await queryRunner.rollbackTransaction();
        results.errors.push(`Dòng ${i + 1}: Lỗi xử lý - ${err.message}`);
      } finally {
        await queryRunner.release();
      }
    }

    return results;
  }
}
