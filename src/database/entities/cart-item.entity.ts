import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Cart } from './cart.entity';
import { Course } from './course.entity';

@Entity('cart_items')
export class CartItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'cart_id' })
  cart_id: number;

  @Column({ name: 'course_id' })
  course_id: number;

  @Column({ name: 'coupon_id', nullable: true })
  coupon_id: number;

  @ManyToOne(() => Cart, (cart) => cart.cart_items)
  @JoinColumn({ name: 'cart_id' })
  cart: Cart;

  @ManyToOne(() => Course)
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column('decimal', { precision: 10, scale: 2, name: 'original_price' })
  original_price: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0, name: 'discount_amount' })
  discount_amount: number;

  @Column('decimal', { precision: 10, scale: 2, name: 'final_price' })
  final_price: number;

  @CreateDateColumn({ name: 'added_at' })
  added_at: Date;
}
