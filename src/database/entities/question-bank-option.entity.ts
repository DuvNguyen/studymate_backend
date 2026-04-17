import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { QuestionBankQuestion } from './question-bank-question.entity';

@Entity('question_bank_options')
@Index('idx_qbo_question', ['questionId'])
export class QuestionBankOption {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'question_id' })
  questionId: number;

  @ManyToOne(() => QuestionBankQuestion, (question) => question.options, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'question_id' })
  question: QuestionBankQuestion;

  @Column({ type: 'text', name: 'option_text' })
  optionText: string;

  @Column({ type: 'boolean', name: 'is_correct', default: false })
  isCorrect: boolean;

  @Column({ type: 'int', name: 'sort_order', nullable: true })
  sortOrder: number | null;
}
