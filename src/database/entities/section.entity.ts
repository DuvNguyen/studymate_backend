import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Course } from './course.entity';
import { Lesson } from './lesson.entity';

@Entity('sections')
export class Section {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('idx_sections_course')
  @Column({ name: 'course_id' })
  courseId: number;

  @ManyToOne(() => Course, (course) => course.sections, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'int', default: 0 })
  position: number;

  @OneToMany(() => Lesson, (lesson) => lesson.section)
  lessons: Lesson[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
