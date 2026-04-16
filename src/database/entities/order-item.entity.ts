import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { Course } from './course.entity';
import { User } from './user.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'order_id' })
  order_id: number;

  @Column({ name: 'course_id' })
  course_id: number;

  @Column({ name: 'instructor_id' })
  instructor_id: number;

  @ManyToOne(() => Order, (order) => order.order_items)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ManyToOne(() => Course)
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'instructor_id' })
  instructor: User;

  @Column('decimal', { precision: 10, scale: 2, name: 'course_price' })
  course_price: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0, name: 'discount_amount' })
  discount_amount: number;

  @Column('decimal', { precision: 10, scale: 2, name: 'final_price' })
  final_price: number;

  @Column('decimal', { precision: 5, scale: 2, name: 'commission_rate' })
  commission_rate: number;

  @Column('decimal', { precision: 10, scale: 2, name: 'platform_fee' })
  platform_fee: number;

  @Column('decimal', { precision: 10, scale: 2, name: 'instructor_amount' })
  instructor_amount: number;
}
