import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Exam } from './exam.entity';
import { Section } from './section.entity';
import { QuestionDifficulty } from './question-bank-question.entity';

@Entity('exam_section_configs')
@Index('idx_esc_exam', ['examId'])
export class ExamSectionConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'exam_id' })
  examId: number;

  @ManyToOne(() => Exam, (exam) => exam.sectionConfigs, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'exam_id' })
  exam: Exam;

  @Column({ name: 'section_id', nullable: true })
  sectionId: number | null;

  @ManyToOne(() => Section, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'section_id' })
  section: Section | null;

  @Column({ type: 'int', name: 'num_questions' })
  numQuestions: number;

  @Column({ type: 'varchar', nullable: true })
  difficulty: QuestionDifficulty | null;
}
