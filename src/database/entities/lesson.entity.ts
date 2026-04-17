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
import { Section } from './section.entity';
import { Video } from './video.entity';

@Entity('lessons')
export class Lesson {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('idx_lessons_section')
  @Column({ name: 'section_id' })
  sectionId: number;

  @ManyToOne(() => Section, (section) => section.lessons, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'section_id' })
  section: Section;

  @Column({ name: 'video_id', nullable: true })
  videoId: number | null;

  @ManyToOne(() => Video, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'video_id' })
  video: Video | null;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text', nullable: true })
  content: string | null;

  @Column({ type: 'int', default: 0 })
  position: number;

  @Column({ type: 'boolean', name: 'is_preview', default: false })
  isPreview: boolean;

  @Column({ type: 'int', name: 'duration_secs', default: 0 })
  durationSecs: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
