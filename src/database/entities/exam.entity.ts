import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Course } from './course.entity';
import { QuestionBank } from './question-bank.entity';
import { User } from './user.entity';
import { ExamSectionConfig } from './exam-section-config.entity';

@Entity('exams')
@Index('idx_exams_course', ['courseId'])
export class Exam {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'course_id' })
  courseId: number;

  @ManyToOne(() => Course, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column({ name: 'bank_id' })
  bankId: number;

  @ManyToOne(() => QuestionBank, { nullable: false })
  @JoinColumn({ name: 'bank_id' })
  bank: QuestionBank;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', name: 'target_class', nullable: true })
  targetClass: string | null;

  @Column({ type: 'varchar', name: 'target_cohort', nullable: true })
  targetCohort: string | null;

  @Column({ type: 'date', name: 'exam_date', nullable: true })
  examDate: Date | null;

  @Column({ type: 'int', name: 'time_limit', nullable: true })
  timeLimit: number | null;

  @Column({ name: 'created_by', nullable: true })
  createdById: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User | null;

  @OneToMany(() => ExamSectionConfig, (config) => config.exam, { cascade: true })
  sectionConfigs: ExamSectionConfig[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
