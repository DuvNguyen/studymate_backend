import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from '../../database/entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationsRepo: Repository<Notification>,
  ) {}

  async findAllByUser(userId: number) {
    return this.notificationsRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async sendNotification(userId: number, type: NotificationType, title: string, message: string, metadata?: any) {
    const notification = this.notificationsRepo.create({
      userId,
      type,
      title,
      message,
      metadata,
    });
    return this.notificationsRepo.save(notification);
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

  async markAllAsRead(userId: number) {
    await this.notificationsRepo.update({ userId, isRead: false }, { isRead: true });
    return { success: true };
  }
}
