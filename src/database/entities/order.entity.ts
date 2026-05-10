import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { OrderItem } from './order-item.entity';
import { Coupon } from './coupon.entity';

export enum OrderStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  EXPIRED = 'EXPIRED',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, name: 'order_number' })
  order_number: string;

  @Column({ name: 'student_id' })
  student_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'student_id' })
  student: User;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order)
  order_items: OrderItem[];

  @Column({ nullable: true, name: 'coupon_id' })
  coupon_id: number;

  @ManyToOne(() => Coupon)
  @JoinColumn({ name: 'coupon_id' })
  coupon: Coupon;

  @Column('decimal', { precision: 10, scale: 2, name: 'subtotal' })
  subtotal: number;

  @Column('decimal', {
    precision: 10,
    scale: 2,
    default: 0,
    name: 'discount_amount',
  })
  discount_amount: number;

  @Column('decimal', { precision: 10, scale: 2, name: 'total_amount' })
  total_amount: number;

  @Column({ nullable: true, name: 'payment_method' })
  payment_method: string;

  @Column({ nullable: true, name: 'payment_gateway_id' })
  payment_gateway_id: string;

  @Column({ type: 'varchar', default: OrderStatus.PENDING })
  status: OrderStatus;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'completed_at' })
  completed_at: Date;
}
