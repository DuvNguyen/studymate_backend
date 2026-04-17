import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Tree,
  TreeChildren,
  TreeParent,
} from 'typeorm';
import { User } from './user.entity';
import { Lesson } from './lesson.entity';
import { Course } from './course.entity';

@Entity('lesson_discussions')
@Tree('materialized-path')
export class LessonDiscussion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  course_id: number;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column()
  lesson_id: number;

  @ManyToOne(() => Lesson, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson;

  @Column()
  user_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'text' })
  content: string;

  @Column({ default: false })
  is_best_answer: boolean;

  @Column({ default: false })
  is_edited: boolean;

  @TreeParent()
  @JoinColumn({ name: 'parent_id' })
  parent: LessonDiscussion;

  @TreeChildren()
  children: LessonDiscussion[];

  @Column({ nullable: true })
  parent_id: number;

  @Column({ default: false })
  is_deleted: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
