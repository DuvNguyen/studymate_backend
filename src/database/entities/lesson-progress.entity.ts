import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Enrollment } from './enrollment.entity';
import { Lesson } from './lesson.entity';

@Entity('lesson_progress')
@Index(['enrollment_id', 'lesson_id'], { unique: true })
export class LessonProgress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  enrollment_id: number;

  @ManyToOne(() => Enrollment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'enrollment_id' })
  enrollment: Enrollment;

  @Column()
  lesson_id: number;

  @ManyToOne(() => Lesson, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson;

  @Column({ default: 0 })
  watched_duration: number;

  @Column({ default: false })
  completed: boolean;

  @Column({ type: 'timestamp', nullable: true })
  last_watched_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
