import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from '../../database/entities/user.entity';
import { Role } from '../../database/entities/role.entity';
import { InstructorProfile, KycStatus } from '../../database/entities/instructor-profile.entity';
import { createClerkClient } from '@clerk/backend';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(Role)
    private roleRepo: Repository<Role>,

    @InjectRepository(InstructorProfile)
    private instructorProfileRepo: Repository<InstructorProfile>,
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

  async onboardUser(clerkUserId: string, targetRole: string) {
    // Chỉ chấp nhận STUDENT hoặc INSTRUCTOR
    const validRole = targetRole === 'INSTRUCTOR' ? 'INSTRUCTOR' : 'STUDENT';

    const roleRecord = await this.roleRepo.findOne({
      where: { roleName: validRole },
    });

    if (!roleRecord) {
      throw new Error(`Khoá định danh Role ${validRole} không tồn tại trong DB.`);
    }

    let user = await this.userRepo.findOne({ where: { clerkUserId } });
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

    if (!user) {
      // Nếu Webhook chưa kịp sync hoặc đang chạy local không có Ngrok
      // Chủ động kéo thông tin từ Clerk để tạo User
      try {
        const clerkUser = await clerk.users.getUser(clerkUserId);
        const email = clerkUser.emailAddresses[0]?.emailAddress;
        
        if (!email) throw new Error('Không tìm thấy email từ Clerk');

        user = this.userRepo.create({
          clerkUserId,
          email,
          roleId: roleRecord.id,
          avatarUrl: clerkUser.imageUrl,
          status: UserStatus.ACTIVE,
        });
        await this.userRepo.save(user);
      } catch (error: any) {
        throw new UnauthorizedException('Không tìm thấy tài khoản và không thể đồng bộ từ Clerk: ' + error.message);
      }
    } else {
      // 1. Cập nhật role_id trong database nếu đã tồn tại
      user.roleId = roleRecord.id;
      await this.userRepo.save(user);
    }

    // 2. Cập nhật `public_metadata` trên hệ thống Clerk thông qua SDK
    await clerk.users.updateUserMetadata(clerkUserId, {
      publicMetadata: { role: validRole },
    });

    // 3. (Strict RBAC) Nếu là Giảng viên, cấp luôn profile trắng để nộp KYC
    if (validRole === 'INSTRUCTOR') {
      const existingInstructorProfile = await this.instructorProfileRepo.findOne({
        where: { userId: user.id },
      });

      if (!existingInstructorProfile) {
        await this.instructorProfileRepo.save({
          userId: user.id,
          kycStatus: KycStatus.PENDING,
        });
      }
    }

    return { role: validRole };
  }
}