import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClerkWebhookController } from './clerk.webhook';
import { User } from '../database/entities/user.entity';
import { Role } from '../database/entities/role.entity';
import { Profile } from '../database/entities/profile.entity';
import { InstructorProfile } from '../database/entities/instructor-profile.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, Profile, InstructorProfile])],
  controllers: [ClerkWebhookController],
})
export class WebhooksModule {}
