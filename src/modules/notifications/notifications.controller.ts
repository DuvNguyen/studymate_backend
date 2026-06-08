import { Controller, Delete, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';
import { ListNotificationsDto } from './dto/list-notifications.dto';
import { NotificationCategory } from '../../database/entities/notification.entity';

@Controller('notifications')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(
    @CurrentUser() user: User,
    @Query() query: ListNotificationsDto,
  ) {
    return this.notificationsService.findPaginatedByUser(user.id, query);
  }

  @Get('me')
  async getMyNotifications(@CurrentUser() user: User) {
    return this.notificationsService.findAllByUser(user.id);
  }

  @Patch(':id/read')
  async markRead(@Param('id') id: string, @CurrentUser() user: User) {
    return this.notificationsService.markAsRead(+id, user.id);
  }

  @Patch('read-all')
  async markAllRead(
    @CurrentUser() user: User,
    @Query('category') category?: NotificationCategory,
  ) {
    return this.notificationsService.markAllAsRead(user.id, category);
  }

  @Delete('old')
  async deleteOldRead(
    @CurrentUser() user: User,
    @Query('before') before?: string,
  ) {
    return this.notificationsService.deleteOldRead(user.id, before);
  }
}
