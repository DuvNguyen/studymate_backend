import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
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

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Cart) private cartsRepo: Repository<Cart>,
    @InjectRepository(Order) private ordersRepo: Repository<Order>,
    private dataSource: DataSource
  ) {}

  async checkoutParams(user: User) {
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

      const order = queryRunner.manager.create(Order, {
        order_number: orderNumber,
        student_id: user.id,
        subtotal: 0,
        discount_amount: 0,
        total_amount: 0,
        status: OrderStatus.PENDING,
      });
      await queryRunner.manager.save(order);

      for (const item of cart.cart_items) {
        const course = item.course;
        if (!course || course.status !== CourseStatus.PUBLISHED) {
          throw new BadRequestException(`Khóa học ${course?.title || 'Unknown'} không khả dụng`);
        }

        const price = Number(course.price);
        const commissionRate = 0.20; // 20% platform fee
        const platformFee = price * commissionRate;
        const instructorAmount = price - platformFee;

        const orderItem = queryRunner.manager.create(OrderItem, {
          order_id: order.id,
          course_id: course.id,
          instructor_id: course.instructorId,
          course_price: price,
          discount_amount: 0,
          final_price: price,
          commission_rate: commissionRate,
          platform_fee: platformFee,
          instructor_amount: instructorAmount,
        });
        
        await queryRunner.manager.save(orderItem);
        totalAmount += price;
      }

      order.subtotal = totalAmount;
      order.total_amount = totalAmount;
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
      if (order.status === OrderStatus.COMPLETED) throw new BadRequestException('Order already completed');

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
          where: { user_id: item.instructor_id }
        });

        if (!wallet) {
          wallet = queryRunner.manager.create(Wallet, {
            user_id: item.instructor_id,
            balance_pending: 0,
            balance_available: 0,
            total_earned: 0,
          }) as Wallet;
          await queryRunner.manager.save(wallet);
        }

        // Add to pending because of refund period (e.g. locked for 15 days)
        const lockedUntil = new Date();
        lockedUntil.setDate(lockedUntil.getDate() + 15);

        wallet.balance_pending = Number(wallet.balance_pending) + Number(item.instructor_amount);
        wallet.total_earned = Number(wallet.total_earned) + Number(item.instructor_amount);
        await queryRunner.manager.save(wallet);

        const transaction = queryRunner.manager.create(Transaction, {
          wallet_id: wallet.id,
          order_item_id: item.id,
          transaction_type: 'EARNING',
          amount: Number(item.instructor_amount),
          status: 'LOCKED',
          locked_until: lockedUntil,
        });
        await queryRunner.manager.save(transaction);
      }

      await queryRunner.commitTransaction();
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
