import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  // Lấy user từ DB dựa theo clerkUserId (đã được verify bởi guard)
  async getUserByClerkId(clerkUserId: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { clerkUserId },
      relations: ['role'],
    });

    if (!user) {
      throw new UnauthorizedException(
        'Tài khoản không tồn tại trong hệ thống. Hãy thử đăng ký lại.',
      );
    }

    if (user.status === 'BANNED') {
      throw new UnauthorizedException('Tài khoản đã bị khóa vĩnh viễn.');
    }

    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Tài khoản đang bị tạm đình chỉ.');
    }

    return user;
  }

  // Lấy thông tin profile đầy đủ để trả về client
  async getMe(clerkUserId: string) {
    const user = await this.getUserByClerkId(clerkUserId);

    return {
      id: user.id,
      email: user.email,
      clerkUserId: user.clerkUserId,
      avatarUrl: user.avatarUrl,
      role: user.role.roleName,
      status: user.status,
      createdAt: user.createdAt,
    };
  }
}