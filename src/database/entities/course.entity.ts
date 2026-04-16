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
import { User } from './user.entity';
import { Category } from './category.entity';
import { Video } from './video.entity';
import { Section } from './section.entity';

export enum CourseStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  PUBLISHED = 'PUBLISHED',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED',
}

export enum CourseLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
}

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn()
  id: number;

  // ── Foreign Keys ──────────────────────────────────────────────

  @Index('idx_courses_instructor')
  @Column({ name: 'instructor_id' })
  instructorId: number;

  @ManyToOne(() => User, (user) => user.courses, { nullable: false })
  @JoinColumn({ name: 'instructor_id' })
  instructor: User;

  @Index('idx_courses_category')
  @Column({ name: 'category_id' })
  categoryId: number;

  @ManyToOne(() => Category, (category) => category.courses, { nullable: false })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ name: 'preview_video_id', nullable: true })
  previewVideoId: number | null;

  @ManyToOne(() => Video, { nullable: true })
  @JoinColumn({ name: 'preview_video_id' })
  previewVideo: Video | null;

  // ── Thông tin cơ bản ──────────────────────────────────────────

  @OneToMany(() => Section, (section) => section.course)
  sections: Section[];

  @Column({ type: 'varchar', unique: true })
  title: string;

  @Index('idx_courses_slug')
  @Column({ type: 'varchar', unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', name: 'thumbnail_url', nullable: true })
  thumbnailUrl: string | null;

  // ── Giá ───────────────────────────────────────────────────────

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'original_price', nullable: true })
  originalPrice: number | null;

  // ── Phân loại ─────────────────────────────────────────────────

  @Column({ type: 'varchar', default: 'vi' })
  language: string;

  @Column({ type: 'varchar', default: CourseLevel.BEGINNER })
  level: CourseLevel;

  // ── Trạng thái ────────────────────────────────────────────────

  @Index('idx_courses_status')
  @Column({ type: 'varchar', default: CourseStatus.DRAFT })
  status: CourseStatus;

  @Column({ type: 'text', name: 'rejection_reason', nullable: true })
  rejectionReason: string | null;

  // ── Thống kê denormalized (cập nhật bằng event trigger sau) ───

  @Column({ type: 'int', name: 'total_duration', default: 0 })
  totalDuration: number;

  @Column({ type: 'int', name: 'lesson_count', default: 0 })
  lessonCount: number;

  @Column({ type: 'int', name: 'section_count', default: 0 })
  sectionCount: number;

  @Column({ type: 'int', name: 'student_count', default: 0 })
  studentCount: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, name: 'avg_rating', default: 0 })
  avgRating: number;

  @Column({ type: 'int', name: 'review_count', default: 0 })
  reviewCount: number;

  // ── Timestamps ────────────────────────────────────────────────

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'timestamp', name: 'published_at', nullable: true })
  publishedAt: Date | null;
}
