import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, LessThan, Repository } from 'typeorm';
import {
  Notification,
  NotificationCategory,
  NotificationEventType,
  NotificationType,
} from '../../database/entities/notification.entity';
import { ListNotificationsDto } from './dto/list-notifications.dto';
import {
  CreateNotificationPayload,
  NOTIFICATION_CREATED_EVENT,
  NotificationCreatedEvent,
} from './notification-events';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationsRepo: Repository<Notification>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAllByUser(userId: number) {
    return this.notificationsRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findPaginatedByUser(userId: number, query: ListNotificationsDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const where: FindOptionsWhere<Notification> = { userId };

    if (query.category) {
      where.category = query.category;
    }

    if (query.status) {
      where.isRead = query.status === 'read';
    }

    const [data, total] = await this.notificationsRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async sendNotification(payload: CreateNotificationPayload): Promise<Notification>;
  async sendNotification(
    userId: number,
    type: NotificationType,
    title: string,
    message: string,
    metadata?: Record<string, unknown>,
  ): Promise<Notification>;
  async sendNotification(
    payloadOrUserId: CreateNotificationPayload | number,
    type?: NotificationType,
    title?: string,
    message?: string,
    metadata?: Record<string, unknown>,
  ) {
    const payload =
      typeof payloadOrUserId === 'number'
        ? this.createLegacyPayload(payloadOrUserId, type, title, message, metadata)
        : payloadOrUserId;

    const notification = this.notificationsRepo.create({
      userId: payload.userId,
      type: payload.type || NotificationType.SYSTEM,
      category: payload.category || NotificationCategory.SYSTEM,
      eventType: payload.eventType || NotificationEventType.SYSTEM,
      title: payload.title,
      message: payload.message,
      linkUrl: payload.linkUrl || null,
      metadata: payload.metadata || null,
    });
    const saved = await this.notificationsRepo.save(notification);

    this.eventEmitter.emit(NOTIFICATION_CREATED_EVENT, {
      notification: saved,
    } satisfies NotificationCreatedEvent);

    return saved;
  }

  async markAsRead(id: number, userId: number) {
    const notification = await this.notificationsRepo.findOne({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Thông báo không tồn tại');
    }

    notification.isRead = true;
    return this.notificationsRepo.save(notification);
  }

  async markAllAsRead(userId: number, category?: NotificationCategory) {
    await this.notificationsRepo.update(
      { userId, isRead: false, ...(category ? { category } : {}) },
      { isRead: true },
    );
    return { success: true };
  }

  async deleteOldRead(userId: number, before?: string) {
    const beforeDate = before ? new Date(before) : this.getDefaultDeleteBeforeDate();
    if (Number.isNaN(beforeDate.getTime())) {
      throw new BadRequestException('Mốc thời gian xóa thông báo không hợp lệ');
    }

    const result = await this.notificationsRepo.delete({
      userId,
      isRead: true,
      createdAt: LessThan(beforeDate),
    });

    return { success: true, deleted: result.affected || 0 };
  }

  private createLegacyPayload(
    userId: number,
    type?: NotificationType,
    title?: string,
    message?: string,
    metadata?: Record<string, unknown>,
  ): CreateNotificationPayload {
    if (!type || !title || !message) {
      throw new Error('Thiếu dữ liệu tạo thông báo');
    }

    return {
      userId,
      type,
      title,
      message,
      metadata,
      category: this.inferCategory(type),
      eventType: NotificationEventType.SYSTEM,
    };
  }

  private inferCategory(type: NotificationType) {
    if ([NotificationType.ORDER, NotificationType.WALLET].includes(type)) {
      return NotificationCategory.TRANSACTIONS;
    }

    if (
      [
        NotificationType.COURSE,
        NotificationType.COMMUNITY,
        NotificationType.ENROLLMENT,
        NotificationType.QUIZ,
        NotificationType.REVIEW,
      ].includes(type)
    ) {
      return NotificationCategory.LEARNING;
    }

    return NotificationCategory.SYSTEM;
  }

  private getDefaultDeleteBeforeDate() {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date;
  }
}
