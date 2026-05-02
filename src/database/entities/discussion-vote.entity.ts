import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { LessonDiscussion } from './lesson-discussion.entity';

@Entity('discussion_votes')
@Unique('idx_disc_votes_unique', ['discussion_id', 'user_id'])
export class DiscussionVote {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  discussion_id: number;

  @ManyToOne(() => LessonDiscussion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'discussion_id' })
  discussion: LessonDiscussion;

  @Column()
  user_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'int' })
  value: number; // 1 for upvote, -1 for downvote

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
