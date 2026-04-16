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
import { QuestionBank } from './question-bank.entity';
import { Section } from './section.entity';
import { User } from './user.entity';
import { QuestionBankOption } from './question-bank-option.entity';

export enum QuestionType {
  MCQ = 'MCQ',
  TRUE_FALSE = 'TRUE_FALSE',
}

export enum QuestionDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

@Entity('question_bank_questions')
@Index('idx_qbq_bank', ['bankId'])
@Index('idx_qbq_section', ['sectionId'])
export class QuestionBankQuestion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'bank_id' })
  bankId: number;

  @ManyToOne(() => QuestionBank, (bank) => bank.questions, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bank_id' })
  bank: QuestionBank;

  @Column({ name: 'section_id', nullable: true })
  sectionId: number | null;

  @ManyToOne(() => Section, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'section_id' })
  section: Section | null;

  @Column({ type: 'text', name: 'question_text' })
  questionText: string;

  @Column({ type: 'varchar', name: 'question_type', default: QuestionType.MCQ })
  questionType: QuestionType;

  @Column({ type: 'varchar', nullable: true })
  difficulty: QuestionDifficulty | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'added_by', nullable: true })
  addedById: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'added_by' })
  addedBy: User | null;

  @OneToMany(() => QuestionBankOption, (option) => option.question, { cascade: true })
  options: QuestionBankOption[];

  @CreateDateColumn({ name: 'added_at' })
  addedAt: Date;
}
