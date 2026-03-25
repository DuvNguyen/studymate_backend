import {
  Controller,
  Post,
  Headers,
  Req,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Webhook } from 'svix';
import type { Request } from 'express';
import { User } from '../database/entities/user.entity';
import { Role } from '../database/entities/role.entity';

@Controller('webhooks')
export class ClerkWebhookController {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(Role)
    private roleRepo: Repository<Role>,

    private config: ConfigService,
  ) {}

  @Post('clerk')
  async handleClerkWebhook(
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
    @Req() req: Request,
  ) {
    const webhookSecret = this.config.get<string>('CLERK_WEBHOOK_SECRET');

    if (!webhookSecret) {
      throw new InternalServerErrorException('Thiếu cấu hình CLERK_WEBHOOK_SECRET');
    }

    // Xác minh chữ ký webhook từ Clerk
    const wh = new Webhook(webhookSecret);
    let payload: any;

    try {
      payload = wh.verify((req as any).rawBody, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      });
    } catch {
      throw new BadRequestException('Chữ ký webhook không hợp lệ');
    }

    // Xử lý sự kiện user.created
    if (payload.type === 'user.created') {
      const { id: clerkUserId, email_addresses, image_url } = payload.data;
      const email = email_addresses?.[0]?.email_address;

      if (!email) {
        throw new BadRequestException('Không tìm thấy email trong payload');
      }

      // Kiểm tra user đã tồn tại chưa (tránh duplicate)
      const existing = await this.userRepo.findOne({ where: { clerkUserId } });
      if (existing) {
        return { received: true };
      }

      // Lấy role STUDENT mặc định
      const studentRole = await this.roleRepo.findOne({
        where: { roleName: 'STUDENT' },
      });

      if (!studentRole) {
        throw new InternalServerErrorException(
          'Role STUDENT chưa được khởi tạo trong DB. Hãy chạy seed trước.',
        );
      }

      // Tạo user mới trong DB
      await this.userRepo.save({
        clerkUserId,
        email,
        roleId: studentRole.id,
        avatarUrl: image_url || null,
      });

      console.log(`✅ Tạo user mới từ Clerk: ${email}`);
    }

    // Xử lý sự kiện user.updated (sync email, avatar)
    if (payload.type === 'user.updated') {
      const { id: clerkUserId, email_addresses, image_url } = payload.data;
      const email = email_addresses?.[0]?.email_address;

      await this.userRepo.update(
        { clerkUserId },
        { email, avatarUrl: image_url || null },
      );
    }

    // Xử lý sự kiện user.deleted
    if (payload.type === 'user.deleted') {
      const { id: clerkUserId } = payload.data;
      // Không xóa cứng — chỉ đổi status thành BANNED để giữ lịch sử
      await this.userRepo.update({ clerkUserId }, { status: 'BANNED' as any });
    }

    return { received: true };
  }
}