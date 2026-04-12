import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export enum VideoStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('videos')
export class Video {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('idx_videos_uploader')
  @Column({ name: 'uploader_id' })
  uploaderId: number;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'uploader_id' })
  uploader: User;

  /**
   * Key nội bộ — YouTube video ID sau khi upload thành công.
   * Không phải public URL.
   */
  @Column({ type: 'varchar', name: 'storage_key' })
  storageKey: string;

  /**
   * CDN/embed URL — chỉ có giá trị sau khi status = APPROVED.
   * Với YouTube: "https://www.youtube.com/embed/{videoId}"
   */
  @Column({ type: 'varchar', name: 'cdn_url', nullable: true })
  cdnUrl: string | null;

  /** YouTube video ID (từ YouTube Data API v3 sau khi upload) */
  @Column({ type: 'varchar', name: 'youtube_video_id', nullable: true })
  youtubeVideoId: string | null;

  @Column({ type: 'int', name: 'duration_secs', nullable: true })
  durationSecs: number | null;

  @Column({ type: 'int', name: 'file_size_kb', nullable: true })
  fileSizeKb: number | null;

  @Index('idx_videos_status')
  @Column({ type: 'varchar', default: VideoStatus.PENDING })
  status: VideoStatus;

  @Column({ name: 'reviewed_by', nullable: true })
  reviewedBy: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer: User | null;

  @Column({ type: 'timestamp', name: 'reviewed_at', nullable: true })
  reviewedAt: Date | null;

  @Column({ type: 'text', name: 'reject_reason', nullable: true })
  rejectReason: string | null;

  @CreateDateColumn({ name: 'uploaded_at' })
  uploadedAt: Date;
}
