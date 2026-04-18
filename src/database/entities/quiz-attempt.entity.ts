import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Quiz } from './quiz.entity';
import { User } from './user.entity';

@Entity('quiz_attempts')
@Index('idx_quiz_attempts_quiz', ['quizId'])
@Index('idx_quiz_attempts_user', ['userId'])
export class QuizAttempt {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'quiz_id' })
  quizId: number;

  @ManyToOne(() => Quiz, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quiz_id' })
  quiz: Quiz;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  score: number;

  @Column({ type: 'boolean', name: 'is_passed', default: false })
  isPassed: boolean;

  @Column({ type: 'jsonb', name: 'question_snapshots' })
  questionSnapshots: any; // Saves randomized questions and options (without isCorrect)

  @Column({ type: 'jsonb', name: 'answers', nullable: true })
  answers: any; // { questionId: selectedOptionId }

  @CreateDateColumn({ name: 'started_at' })
  startedAt: Date;

  @Column({ type: 'timestamp', name: 'completed_at', nullable: true })
  completedAt: Date | null;
}
