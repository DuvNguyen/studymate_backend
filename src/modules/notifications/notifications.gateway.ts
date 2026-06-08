import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { verifyToken } from '@clerk/backend';
import { Server, Socket } from 'socket.io';
import { UsersService } from '../users/users.service';
import { NOTIFICATION_CREATED_EVENT } from './notification-events';
import type { NotificationCreatedEvent } from './notification-events';

@WebSocketGateway({ namespace: 'notifications' })
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async handleConnection(client: Socket) {
    const token = this.extractToken(client);
    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const normalizeOrigin = (value: string) => value.trim().replace(/\/+$/, '');
      const frontendOrigins = (this.config.get<string>('FRONTEND_URL') || '')
        .split(',')
        .map((origin) => normalizeOrigin(origin))
        .filter(Boolean);
      const payload = await verifyToken(token, {
        jwtKey: this.config.get<string>('CLERK_JWT_KEY'),
        authorizedParties: ['http://localhost:3000', ...frontendOrigins],
      });
      const user = await this.usersService.findOneByClerkId(payload.sub);

      if (!user) {
        client.disconnect(true);
        return;
      }

      client.data.userId = user.id;
      await client.join(this.getUserRoom(user.id));
      this.logger.log('Notification socket connected for user ' + user.id);
    } catch (error) {
      this.logger.warn(
        'Notification socket auth failed: ' +
          (error instanceof Error ? error.message : String(error)),
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data.userId) {
      this.logger.log(
        'Notification socket disconnected for user ' + client.data.userId,
      );
    }
  }

  @OnEvent(NOTIFICATION_CREATED_EVENT)
  handleNotificationCreated(event: NotificationCreatedEvent) {
    this.server
      .to(this.getUserRoom(event.notification.userId))
      .emit('notification:new', event.notification);
  }

  private extractToken(client: Socket) {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken;
    }

    const header = client.handshake.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.replace('Bearer ', '');
    }

    return null;
  }

  private getUserRoom(userId: number) {
    return 'user:' + userId;
  }
}
