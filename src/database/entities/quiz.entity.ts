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
import { Course } from './course.entity';
import { Section } from './section.entity';
import { QuestionBank } from './question-bank.entity';

@Entity('quizzes')
@Index('idx_quizzes_course', ['courseId'])
@Index('idx_quizzes_section', ['sectionId'])
export class Quiz {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'course_id' })
  courseId: number;

  @ManyToOne(() => Course, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column({ name: 'section_id', nullable: true })
  sectionId: number | null;

  @ManyToOne(() => Section, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'section_id' })
  section: Section | null;

  @Column({ name: 'bank_id' })
  bankId: number;

  @ManyToOne(() => QuestionBank, { nullable: false })
  @JoinColumn({ name: 'bank_id' })
  bank: QuestionBank;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'int', name: 'passing_score', default: 80 })
  passingScore: number;

  @Column({ type: 'int', name: 'time_limit', default: 30 })
  timeLimit: number; // minutes

  @Column({ type: 'int', name: 'num_questions', default: 10 })
  numQuestions: number;

  @Column({ type: 'boolean', name: 'is_final', default: false })
  isFinal: boolean;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
