import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClerkWebhookController } from './clerk.webhook';
import { PayosWebhookController } from './payos.webhook';
import { User } from '../database/entities/user.entity';
import { Role } from '../database/entities/role.entity';
import { Profile } from '../database/entities/profile.entity';
import { InstructorProfile } from '../database/entities/instructor-profile.entity';
import { OrdersModule } from '../modules/orders/orders.module';
import { PaymentsModule } from '../modules/payments/payments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, Profile, InstructorProfile]),
    OrdersModule,
    PaymentsModule,
  ],
  controllers: [ClerkWebhookController, PayosWebhookController],
})
export class WebhooksModule {}
