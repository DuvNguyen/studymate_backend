import {
  Notification,
  NotificationCategory,
  NotificationEventType,
  NotificationType,
} from '../../database/entities/notification.entity';

export const NOTIFICATION_CREATED_EVENT = 'notification.created';

export interface CreateNotificationPayload {
  userId: number;
  type?: NotificationType;
  category?: NotificationCategory;
  eventType?: NotificationEventType;
  title: string;
  message: string;
  linkUrl?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface NotificationCreatedEvent {
  notification: Notification;
}
