import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { User } from './user.entity';
import { Course } from './course.entity';
import { OrderItem } from './order-item.entity';

@Entity('enrollments')
export class Enrollment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'student_id' })
  student_id: number;

  @Column({ name: 'course_id' })
  course_id: number;

  @Column({ name: 'order_item_id' })
  order_item_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'student_id' })
  student: User;

  @ManyToOne(() => Course)
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @OneToOne(() => OrderItem)
  @JoinColumn({ name: 'order_item_id' })
  order_item: OrderItem;

  @Column('int', { default: 0, name: 'progress_percent' })
  progress_percent: number;

  @Column({ default: true, name: 'is_active' })
  is_active: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'revoked_at' })
  revoked_at: Date;

  @Column({ nullable: true, name: 'revoke_reason' })
  revoke_reason: string;

  @CreateDateColumn({ name: 'enrolled_at' })
  enrolled_at: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'last_accessed_at' })
  last_accessed_at: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'completed_at' })
  completed_at: Date;
}
