import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';

@Controller('notifications')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('me')
  async getMyNotifications(@CurrentUser() user: User) {
    return this.notificationsService.findAllByUser(user.id);
  }

  @Patch(':id/read')
  async markRead(@Param('id') id: string, @CurrentUser() user: User) {
    return this.notificationsService.markAsRead(+id, user.id);
  }

  @Patch('read-all')
  async markAllRead(@CurrentUser() user: User) {
    return this.notificationsService.markAllAsRead(user.id);
  }
}
