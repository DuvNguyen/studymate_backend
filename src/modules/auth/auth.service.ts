import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from '../../database/entities/user.entity';
import { Role } from '../../database/entities/role.entity';
import {
  InstructorProfile,
  KycStatus,
} from '../../database/entities/instructor-profile.entity';
import { Profile } from '../../database/entities/profile.entity';
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

    @InjectRepository(Profile)
    private profileRepo: Repository<Profile>,

    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  // Lấy user từ DB dựa theo clerkUserId (đã được verify bởi guard)
  async getUserByClerkId(clerkUserId: string): Promise<User> {
    const cacheKey = `user_auth_${clerkUserId}`;
    const cached = await this.cacheManager.get<User>(cacheKey);
    if (cached) return cached;

    const user = await this.userRepo.findOne({
      where: { clerkUserId },
      relations: ['role', 'instructorProfile', 'profile'],
    });

    if (user) {
      await this.cacheManager.set(cacheKey, user, 300 * 1000); // 5 minutes
    }

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

    // Sync with Clerk to get latest info (Name, Avatar)
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    
    let needsUpdate = false;
    let firstName = '';
    let lastName = '';
    let fullName = '';

    try {
      const clerkUser = await clerk.users.getUser(clerkUserId);
      firstName = clerkUser.firstName || '';
      lastName = clerkUser.lastName || '';
      fullName = (firstName + ' ' + lastName).trim();

      // Sync Avatar
      if (clerkUser.imageUrl && user.avatarUrl !== clerkUser.imageUrl) {
        user.avatarUrl = clerkUser.imageUrl;
        needsUpdate = true;
      }

      // Sync Name in Profile
      if (!user.profile) {
        user.profile = this.profileRepo.create({
          userId: user.id,
          fullName: fullName,
        });
        needsUpdate = true;
      } else if (user.profile.fullName !== fullName && fullName !== '') {
        user.profile.fullName = fullName;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await this.userRepo.save(user);
        if (user.profile) await this.profileRepo.save(user.profile);
      }
    } catch (error) {
      console.warn(`[AuthService] Failed to sync with Clerk for ${clerkUserId}:`, error.message);
      // Fallback to local data
      fullName = user.profile?.fullName || user.email.split('@')[0];
    }

    return {
      id: user.id,
      email: user.email,
      clerkUserId: user.clerkUserId,
      avatarUrl: user.avatarUrl,
      role: user.role.roleName,
      status: user.status,
      firstName: firstName || user.profile?.fullName?.split(' ')[0] || '',
      lastName: lastName || user.profile?.fullName?.split(' ').slice(1).join(' ') || '',
      fullName: fullName,
      kycStatus: user.instructorProfile?.kycStatus || null,
      bankName: user.instructorProfile?.bankName || null,
      bankAccountNumber: user.instructorProfile?.bankAccountNumber || null,
      bankAccountName: user.instructorProfile?.bankAccountName || null,
      createdAt: user.createdAt,
    };
  }

  async onboardUser(clerkUserId: string, targetRole: string) {
    // Chỉ chấp nhận STUDENT hoặc INSTRUCTOR cho việc định hướng role ban đầu.
    // Nếu chọn INSTRUCTOR, hệ thống chặn họ ở mức 'USER' cho đến khi KYC duyệt.
    const requestRole = targetRole === 'INSTRUCTOR' ? 'USER' : 'STUDENT';

    const roleRecord = await this.roleRepo.findOne({
      where: { roleName: requestRole },
    });

    if (!roleRecord) {
      throw new Error(
        `Khoá định danh Role ${requestRole} không tồn tại trong DB.`,
      );
    }

    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    let clerkUser: any;
    try {
      clerkUser = await clerk.users.getUser(clerkUserId);
    } catch (error: any) {
      throw new UnauthorizedException(
        'Không thể xác thực info từ Clerk: ' + error.message,
      );
    }

    const email = clerkUser.emailAddresses[0]?.emailAddress;
    if (!email) throw new Error('Không tìm thấy email từ Clerk');

    const firstName = clerkUser.firstName || '';
    const lastName = clerkUser.lastName || '';
    const fullName = (firstName + ' ' + lastName).trim();

    // Tìm user theo clerkUserId (ưu tiên) hoặc email (phòng hờ account bị xóa trên Clerk nhưng còn kẹt trong DB)
    let user = await this.userRepo.findOne({
      where: [{ clerkUserId }, { email }],
      relations: ['profile'],
    });

    try {
      if (!user) {
        // User hoàn toàn mới
        user = this.userRepo.create({
          clerkUserId,
          email,
          roleId: roleRecord.id,
          avatarUrl: clerkUser.imageUrl,
          status: UserStatus.ACTIVE,
        });
        user.role = roleRecord;
        const savedUser = await this.userRepo.save(user);

        // Tạo profile mặc định
        const profile = this.profileRepo.create({
          userId: savedUser.id,
          fullName: fullName,
        });
        await this.profileRepo.save(profile);
      } else {
        // Tự động Heal data nếu clerkUserId bị lệch (vì tạo lại acc cùng email trên Clerk)
        if (user.clerkUserId !== clerkUserId) {
          user.clerkUserId = clerkUserId;
        }
        // Cập nhật role_id trong database
        user.roleId = roleRecord.id;
        user.role = roleRecord;
        user.avatarUrl = clerkUser.imageUrl;
        await this.userRepo.save(user);

        // Cập nhật profile nếu cần
        if (!user.profile) {
          await this.profileRepo.save({
            userId: user.id,
            fullName: fullName,
          });
        } else if (user.profile.fullName !== fullName && fullName !== '') {
          user.profile.fullName = fullName;
          await this.profileRepo.save(user.profile);
        }
      }
    } catch (saveError: any) {
      // Nếu có lỗi tranh chấp (Webhook vừa tạo user xong), thử query lại lần nữa
      console.warn(
        `[AuthService] Onboard Race Condition detected for ${clerkUserId}:`,
        saveError.message,
      );
      user = await this.userRepo.findOne({
        where: [{ clerkUserId }, { email }],
      });
      if (!user) throw saveError; // Nếu vẫn ko có user thì mới fail thực sự
    }

    // 2. Cập nhật `public_metadata` trên hệ thống Clerk thông qua SDK
    await clerk.users.updateUserMetadata(clerkUserId, {
      publicMetadata: { role: requestRole },
    });

    // 3. Nếu định hướng (targetRole) là trở thành Giảng viên, cấp profile KYC trắng chờ duyệt
    if (targetRole === 'INSTRUCTOR') {
      const existingInstructorProfile =
        await this.instructorProfileRepo.findOne({
          where: { userId: user.id },
        });

      if (!existingInstructorProfile) {
        await this.instructorProfileRepo.save({
          userId: user.id,
          kycStatus: KycStatus.UNSUBMITTED,
        });
      }
    }

    return { role: requestRole };
  }
}
