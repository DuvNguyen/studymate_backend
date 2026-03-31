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

    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    let clerkUser: any;
    try {
      clerkUser = await clerk.users.getUser(clerkUserId);
    } catch (error: any) {
      throw new UnauthorizedException('Không thể xác thực info từ Clerk: ' + error.message);
    }

    const email = clerkUser.emailAddresses[0]?.emailAddress;
    if (!email) throw new Error('Không tìm thấy email từ Clerk');

    // Tìm user theo clerkUserId (ưu tiên) hoặc email (phòng hờ account bị xóa trên Clerk nhưng còn kẹt trong DB)
    let user = await this.userRepo.findOne({
      where: [
        { clerkUserId },
        { email }
      ]
    });

    if (!user) {
      // User hoàn toàn mới
      user = this.userRepo.create({
        clerkUserId,
        email,
        roleId: roleRecord.id,
        avatarUrl: clerkUser.imageUrl,
        status: UserStatus.ACTIVE,
      });
      await this.userRepo.save(user);
    } else {
      // Tự động Heal data nếu clerkUserId bị lệch (vì tạo lại acc cùng email trên Clerk)
      if (user.clerkUserId !== clerkUserId) {
        user.clerkUserId = clerkUserId;
      }
      // Cập nhật role_id trong database
      user.roleId = roleRecord.id;
      user.avatarUrl = clerkUser.imageUrl;
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