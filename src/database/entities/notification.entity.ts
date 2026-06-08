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
import { User } from './user.entity';

export enum NotificationType {
  SYSTEM = 'SYSTEM',
  COURSE = 'COURSE',
  ORDER = 'ORDER',
  COMMUNITY = 'COMMUNITY',
  ENROLLMENT = 'ENROLLMENT',
  WALLET = 'WALLET',
  QUIZ = 'QUIZ',
  KYC = 'KYC',
  REVIEW = 'REVIEW',
}

export enum NotificationCategory {
  LEARNING = 'LEARNING',
  TRANSACTIONS = 'TRANSACTIONS',
  SYSTEM = 'SYSTEM',
}

export enum NotificationEventType {
  SYSTEM = 'SYSTEM',
  LESSON_DISCUSSION_REPLY = 'LESSON_DISCUSSION_REPLY',
  LESSON_DISCUSSION_NEW = 'LESSON_DISCUSSION_NEW',
  ORDER_SUCCESS = 'ORDER_SUCCESS',
  REFUND_REQUESTED = 'REFUND_REQUESTED',
  REFUND_APPROVED = 'REFUND_APPROVED',
  REFUND_REJECTED = 'REFUND_REJECTED',
  COURSE_ARCHIVED = 'COURSE_ARCHIVED',
  COURSE_REJECTED = 'COURSE_REJECTED',
  COURSE_COMPLETED = 'COURSE_COMPLETED',
  KYC_APPROVED = 'KYC_APPROVED',
  KYC_REJECTED = 'KYC_REJECTED',
  REVIEW_CREATED = 'REVIEW_CREATED',
  WALLET_INCOME = 'WALLET_INCOME',
  PAYOUT_REQUESTED = 'PAYOUT_REQUESTED',
  PAYOUT_STATUS = 'PAYOUT_STATUS',
  QUIZ_RESULT = 'QUIZ_RESULT',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('idx_notifications_user')
  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'varchar',
    default: NotificationType.SYSTEM,
  })
  type: NotificationType;

  @Index('idx_notifications_category')
  @Column({
    type: 'varchar',
    default: NotificationCategory.SYSTEM,
  })
  category: NotificationCategory;

  @Index('idx_notifications_event_type')
  @Column({ name: 'event_type', type: 'varchar', default: NotificationEventType.SYSTEM })
  eventType: NotificationEventType;

  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ default: false, name: 'is_read' })
  isRead: boolean;

  @Column({ name: 'link_url', type: 'varchar', nullable: true })
  linkUrl: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
