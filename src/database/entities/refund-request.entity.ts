import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { User } from './user.entity';
import { Enrollment } from './enrollment.entity';
import { Course } from './course.entity';

export enum RefundStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('refund_requests')
export class RefundRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enrollment_id' })
  enrollment_id: number;

  @OneToOne(() => Enrollment)
  @JoinColumn({ name: 'enrollment_id' })
  enrollment: Enrollment;

  @Column({ name: 'student_id' })
  student_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column({ name: 'course_id' })
  course_id: number;

  @ManyToOne(() => Course)
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column('text')
  reason: string;

  @Column({ name: 'bank_name' })
  bank_name: string;

  @Column({ name: 'bank_account_number' })
  bank_account_number: string;

  @Column({ name: 'bank_account_name' })
  bank_account_name: string;

  @Column({
    type: 'enum',
    enum: RefundStatus,
    default: RefundStatus.PENDING,
  })
  status: RefundStatus;

  @Column({ type: 'text', nullable: true, name: 'admin_note' })
  admin_note: string | null;

  @Column({ nullable: true, name: 'processed_by_id' })
  processed_by_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'processed_by_id' })
  processed_by: User;

  @Column({ type: 'timestamp', nullable: true, name: 'processed_at' })
  processed_at: Date;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
