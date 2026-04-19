import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { Cart } from '../../database/entities/cart.entity';
import { Order, OrderStatus } from '../../database/entities/order.entity';
import { OrderItem } from '../../database/entities/order-item.entity';
import { Course, CourseStatus } from '../../database/entities/course.entity';
import { Enrollment } from '../../database/entities/enrollment.entity';
import { Wallet } from '../../database/entities/wallet.entity';
import { Transaction } from '../../database/entities/transaction.entity';

import { CouponsService } from '../coupons/coupons.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../database/entities/notification.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Cart) private cartsRepo: Repository<Cart>,
    @InjectRepository(Order) private ordersRepo: Repository<Order>,
    private dataSource: DataSource,
    private couponsService: CouponsService,
    private notificationsService: NotificationsService,
  ) {}

  async checkoutParams(user: User, couponCode?: string) {
    // We use a transaction to ensure cart items are safely turned to order
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const cart = await queryRunner.manager.findOne(Cart, {
        where: { student_id: user.id },
        relations: ['cart_items', 'cart_items.course'],
      });

      if (!cart || cart.cart_items.length === 0) {
        throw new BadRequestException('Giỏ hàng trống');
      }

      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${user.id}`;
      let totalAmount = 0;
      let totalDiscount = 0;

      // 1. Calculate subtotal first to validate coupon
      const subtotal = cart.cart_items.reduce(
        (acc, item) => acc + Number(item.course.price),
        0,
      );

      let appliedCoupon: any = null;
      let discountAmountPerItem = 0;

      if (couponCode) {
        const validation = await this.couponsService.validateCoupon(
          couponCode,
          subtotal,
        );
        appliedCoupon = validation.coupon;
        totalDiscount = validation.discountAmount;
        // Simple proportional discount if multiple items (or just split equally for this version)
        discountAmountPerItem = totalDiscount / cart.cart_items.length;
      }

      const order = queryRunner.manager.create(Order, {
        order_number: orderNumber,
        student_id: user.id,
        subtotal: subtotal,
        discount_amount: totalDiscount,
        total_amount: subtotal - totalDiscount,
        status: OrderStatus.PENDING,
      });
      await queryRunner.manager.save(order);

      for (const item of cart.cart_items) {
        const course = item.course;
        if (!course || course.status !== CourseStatus.PUBLISHED) {
          throw new BadRequestException(
            `Khóa học ${course?.title || 'Unknown'} không khả dụng`,
          );
        }

        const price = Number(course.price);
        const itemDiscount = discountAmountPerItem;
        const finalPrice = price - itemDiscount;

        // Default: 30/70 (0.3). With Coupon: 3/97 (0.03)
        const commissionRate = appliedCoupon ? 0.03 : 0.3;
        const platformFee = finalPrice * commissionRate;
        const instructorAmount = finalPrice - platformFee;

        const orderItem = queryRunner.manager.create(OrderItem, {
          order_id: order.id,
          course_id: course.id,
          instructor_id: course.instructorId,
          course_price: price,
          discount_amount: itemDiscount,
          final_price: finalPrice,
          commission_rate: commissionRate,
          platform_fee: platformFee,
          instructor_amount: instructorAmount,
        });

        await queryRunner.manager.save(orderItem);
        totalAmount += price;
      }

      // If coupon was used, increment its count
      if (appliedCoupon) {
        await this.couponsService.incrementUsedCount(appliedCoupon.id);
      }

      // Finalize order totals (already set in create, but double checking)
      order.total_amount = totalAmount - totalDiscount;
      await queryRunner.manager.save(order);

      // Xóa item trong cart
      await queryRunner.manager.remove(cart.cart_items);

      await queryRunner.commitTransaction();
      return order;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async testFulfillOrder(orderId: number) {
    // This is a temporary method to simulate webhook payment fulfill
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    // Import entities inside method to avoid heavy circular imports if refactoring later
    // Removed because we are pulling them statically now.

    try {
      const order = await queryRunner.manager.findOne(Order, {
        where: { id: orderId },
        relations: ['order_items'],
      });

      if (!order) throw new NotFoundException('Order not found');
      if (order.status === OrderStatus.COMPLETED)
        throw new BadRequestException('Order already completed');

      order.status = OrderStatus.COMPLETED;
      order.completed_at = new Date();
      await queryRunner.manager.save(order);

      // Distribute money and enroll student
      for (const item of order.order_items) {
        // 1. Enroll Student
        const enrollment = queryRunner.manager.create(Enrollment, {
          student_id: order.student_id,
          course_id: item.course_id,
          order_item_id: item.id,
          is_active: true,
          progress_percent: 0,
        });
        await queryRunner.manager.save(enrollment);

        // 2. Instructor Wallet & Transaction
        let wallet: Wallet | null = await queryRunner.manager.findOne(Wallet, {
          where: { user_id: item.instructor_id },
        });

        if (!wallet) {
          wallet = queryRunner.manager.create(Wallet, {
            user_id: item.instructor_id,
            balance_pending: 0,
            balance_available: 0,
            total_earned: 0,
          });
          await queryRunner.manager.save(wallet);
        }

        // Add to pending because of refund period (30 days Rule)
        const lockedUntil = new Date();
        lockedUntil.setDate(lockedUntil.getDate() + 30);

        wallet.balance_pending =
          Number(wallet.balance_pending) + Number(item.instructor_amount);
        wallet.total_earned =
          Number(wallet.total_earned) + Number(item.instructor_amount);
        await queryRunner.manager.save(wallet);

        // Calculate total balance for audit
        const totalBalanceAfter = Number(wallet.balance_available) + Number(wallet.balance_pending);

        const transaction = queryRunner.manager.create(Transaction, {
          wallet_id: wallet.id,
          order_item_id: item.id,
          transaction_type: 'EARNING',
          amount: Number(item.instructor_amount),
          status: 'LOCKED',
          balance_after: totalBalanceAfter,
          locked_until: lockedUntil,
        });
        await queryRunner.manager.save(transaction);

        // 3. Platform Fee Transaction
        // Find or create a system wallet (user_id 1 is typically admin)
        let systemWallet: Wallet | null = await queryRunner.manager.findOne(Wallet, {
          where: { user_id: 1 },
        });
        if (!systemWallet) {
          systemWallet = queryRunner.manager.create(Wallet, {
            user_id: 1,
            balance_pending: 0,
            balance_available: 0,
            total_earned: 0,
          });
          await queryRunner.manager.save(systemWallet);
        }
        systemWallet.balance_available = Number(systemWallet.balance_available) + Number(item.platform_fee);
        await queryRunner.manager.save(systemWallet);

        await queryRunner.manager.save(queryRunner.manager.create(Transaction, {
          wallet_id: systemWallet.id,
          order_item_id: item.id,
          transaction_type: 'PLATFORM_FEE',
          amount: Number(item.platform_fee),
          status: 'COMPLETED',
          balance_after: Number(systemWallet.balance_available) + Number(systemWallet.balance_pending),
        }));

        // 4. Student Purchase Transaction (for history/ledger)
        let studentWallet: Wallet | null = await queryRunner.manager.findOne(Wallet, {
          where: { user_id: order.student_id },
        });
        if (!studentWallet) {
          studentWallet = queryRunner.manager.create(Wallet, {
            user_id: order.student_id,
            balance_pending: 0,
            balance_available: 0,
            total_earned: 0,
          });
          await queryRunner.manager.save(studentWallet);
        }
        // Note: amount is positive for ledger representation of "revenue flow"
        await queryRunner.manager.save(queryRunner.manager.create(Transaction, {
          wallet_id: studentWallet.id,
          order_item_id: item.id,
          transaction_type: 'PURCHASE',
          amount: Number(item.final_price),
          status: 'COMPLETED',
          balance_after: 0, // Students don't track balance in this context
        }));
      }

      await queryRunner.commitTransaction();

      // ── Send Notifications (outside transaction for safety) ──
      for (const item of order.order_items) {
        // Fetch course title for notification messages
        const course = await this.dataSource.manager.findOne(Course, {
          where: { id: item.course_id },
        });
        const courseTitle = course?.title || 'Khóa học';
        const amountFormatted = new Intl.NumberFormat('vi-VN', {
          style: 'currency',
          currency: 'VND',
        }).format(Number(item.instructor_amount));

        // Student notification
        await this.notificationsService.sendNotification(
          order.student_id,
          NotificationType.ENROLLMENT,
          'Đăng ký thành công!',
          `Thanh toán thành công! Khóa học "${courseTitle}" đã được thêm vào thư viện của bạn. Bắt đầu học ngay!`,
          { courseId: item.course_id, orderId: order.id },
        );

        // Instructor notification
        await this.notificationsService.sendNotification(
          item.instructor_id,
          NotificationType.WALLET,
          'Thu nhập mới!',
          `Bạn vừa có học viên mới! ${amountFormatted} đã được cộng vào số dư đóng băng của bạn.`,
          { courseId: item.course_id, orderId: order.id, amount: item.instructor_amount },
        );
      }

      return order;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findOne(id: number) {
    const order = await this.ordersRepo.findOne({
      where: { id },
      relations: ['order_items', 'order_items.course'],
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    return order;
  }
}
