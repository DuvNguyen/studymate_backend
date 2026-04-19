import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('idx_coupons_code', { unique: true })
  @Column({ unique: true })
  code: string;

  @Column({ name: 'instructor_id' })
  instructorId: number;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'instructor_id' })
  instructor: User;

  @Column({
    type: 'varchar',
    default: DiscountType.PERCENTAGE,
    name: 'discount_type',
  })
  discountType: DiscountType;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'discount_value' })
  discountValue: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'min_order_value',
    default: 0,
  })
  minOrderValue: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'max_discount_amount',
    nullable: true,
  })
  maxDiscountAmount: number | null;

  @Column({ type: 'timestamp', name: 'start_date', nullable: true })
  startDate: Date | null;

  @Column({ type: 'timestamp', name: 'end_date', nullable: true })
  endDate: Date | null;

  @Column({ type: 'int', name: 'usage_limit', nullable: true })
  usageLimit: number | null;

  @Column({ type: 'int', name: 'used_count', default: 0 })
  usedCount: number;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
