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
import { QuestionBankQuestion } from './question-bank-question.entity';

@Entity('question_banks')
@Index('idx_qbanks_course', ['courseId'])
export class QuestionBank {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'course_id' })
  courseId: number;

  @ManyToOne(() => Course, { nullable: false })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @OneToMany(() => QuestionBankQuestion, (question) => question.bank)
  questions: QuestionBankQuestion[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
