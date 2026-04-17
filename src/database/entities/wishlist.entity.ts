import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Course } from './course.entity';

@Entity('wishlists')
@Unique(['studentId', 'courseId'])
export class Wishlist {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('idx_wishlists_student')
  @Column({ name: 'student_id' })
  studentId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column({ name: 'course_id' })
  courseId: number;

  @ManyToOne(() => Course)
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @CreateDateColumn({ name: 'added_at' })
  addedAt: Date;
}
