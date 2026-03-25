import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClerkWebhookController } from './clerk.webhook';
import { User } from '../database/entities/user.entity';
import { Role } from '../database/entities/role.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role])],
  controllers: [ClerkWebhookController],
})
export class WebhooksModule {}