import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from '../../database/entities/user.entity';
import { Role } from '../../database/entities/role.entity';
import { Profile } from '../../database/entities/profile.entity';
import {
  InstructorProfile,
  KycStatus,
} from '../../database/entities/instructor-profile.entity';
import { InstructorDocument } from '../../database/entities/instructor-document.entity';
import {
  StaffProfile,
  StaffDepartment,
} from '../../database/entities/staff-profile.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateKycDto } from './dto/update-kyc.dto';
import { UpdateStaffProfileDto } from './dto/update-staff-profile.dto';
import {
  UpdateUserStatusDto,
  UpdateUserRoleDto,
} from './dto/update-user-admin.dto';
import { createClerkClient } from '@clerk/backend';

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedUsers {
  data: any[];
  meta: PaginationMeta;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Role)
    private roleRepo: Repository<Role>,
    @InjectRepository(Profile)
    private profileRepo: Repository<Profile>,
    @InjectRepository(InstructorProfile)
    private instructorProfileRepo: Repository<InstructorProfile>,
    @InjectRepository(InstructorDocument)
    private instructorDocumentRepo: Repository<InstructorDocument>,
    @InjectRepository(StaffProfile)
    private staffProfileRepo: Repository<StaffProfile>,
  ) {}

  async findOneByClerkId(clerkUserId: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: { clerkUserId },
      relations: ['role'],
    });
  }

  // ─── Profile (bản thân) ────────────────────────────────────────────────────

  async getProfile(clerkUserId: string) {
    const user = await this.userRepo.findOne({
      where: { clerkUserId },
      relations: ['role', 'profile'],
    });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    return this.toPublicProfile(user);
  }

  async updateProfile(clerkUserId: string, dto: UpdateProfileDto) {
    const user = await this.userRepo.findOne({
      where: { clerkUserId },
      relations: ['role', 'profile'],
    });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    // Nếu chưa có profile (do lỗi sync), tự tạo 1 cái rỗng
    if (!user.profile) {
      user.profile = this.profileRepo.create({ userId: user.id });
    }

    if (dto.firstName !== undefined || dto.lastName !== undefined) {
      // fullName = firstName + lastName
      const fName =
        dto.firstName !== undefined
          ? dto.firstName
          : user.profile.fullName
            ? user.profile.fullName.split(' ')[0]
            : '';
      const lName =
        dto.lastName !== undefined
          ? dto.lastName
          : user.profile.fullName
            ? user.profile.fullName.split(' ').slice(1).join(' ')
            : '';
      user.profile.fullName = `${fName} ${lName}`.trim();
    }

    if (dto.bio !== undefined) user.profile.bio = dto.bio;
    if (dto.avatarUrl !== undefined) user.avatarUrl = dto.avatarUrl;

    await this.profileRepo.save(user.profile);
    await this.userRepo.save(user);

    return this.toPublicProfile(user);
  }

  // ─── KYC (Giảng viên) ──────────────────────────────────────────────────────

  async getInstructorKyc(clerkUserId: string) {
    const user = await this.userRepo.findOne({
      where: { clerkUserId },
      relations: ['instructorProfile', 'instructorDocuments'],
    });

    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    if (!['INSTRUCTOR', 'USER'].includes(user.role?.roleName || '')) {
      throw new ForbiddenException(
        'Tính năng này chỉ dành cho Giảng viên hoặc Tài khoản đang chờ cấp phép',
      );
    }

    let profile = user.instructorProfile;
    if (!profile) {
      profile = await this.instructorProfileRepo.save({
        userId: user.id,
        kycStatus: KycStatus.PENDING,
      });
    }

    return {
      idCardUrl: profile.idCardUrl,
      bankAccountName: profile.bankAccountName,
      bankAccountNumber: profile.bankAccountNumber,
      bankName: profile.bankName,
      kycStatus: profile.kycStatus,
      rejectionReason: profile.rejectionReason,
      certificates: profile.certificates || [],
      documents: user.instructorDocuments || [],
    };
  }

  async updateInstructorKyc(clerkUserId: string, dto: UpdateKycDto) {
    const user = await this.userRepo.findOne({
      where: { clerkUserId },
      relations: ['instructorProfile', 'instructorDocuments'],
    });

    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    if (!['INSTRUCTOR', 'USER'].includes(user.role?.roleName || '')) {
      throw new ForbiddenException(
        'Tính năng này chỉ dành cho Giảng viên hoặc Tài khoản đang chờ cấp phép',
      );
    }

    let profile = user.instructorProfile;
    if (!profile) {
      profile = this.instructorProfileRepo.create({ userId: user.id });
    }

    // Cập nhật thông tin profile
    if (dto.idCardUrl !== undefined) profile.idCardUrl = dto.idCardUrl;
    if (dto.bankAccountName !== undefined)
      profile.bankAccountName = dto.bankAccountName;
    if (dto.bankAccountNumber !== undefined)
      profile.bankAccountNumber = dto.bankAccountNumber;
    if (dto.bankName !== undefined) profile.bankName = dto.bankName;
    if (dto.certificates !== undefined) profile.certificates = dto.certificates;

    // Đang PENDING chuyển thành PENDING_REVIEW (hoặc giữ nguyên để chờ Admin)
    profile.kycStatus = KycStatus.PENDING; // Tạm khóa trạng thái
    await this.instructorProfileRepo.save(profile);

    // Cập nhật Document: Xoá cũ, Thêm mới (Cơ bản)
    if (dto.documents && dto.documents.length > 0) {
      await this.instructorDocumentRepo.delete({ userId: user.id });
      const newDocs = dto.documents.map((doc) =>
        this.instructorDocumentRepo.create({
          userId: user.id,
          ...doc,
        }),
      );
      await this.instructorDocumentRepo.save(newDocs);
    }

    return this.getInstructorKyc(clerkUserId);
  }

  // ─── Staff Profile ──────────────────────────────────────────────────────────

  async getStaffProfile(clerkUserId: string) {
    const user = await this.userRepo.findOne({
      where: { clerkUserId },
      relations: ['staffProfile'],
    });

    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    if (user.roleId !== 3 && user.roleId !== 4)
      throw new ForbiddenException(
        'Tính năng này chỉ dành cho Nhân viên hoặc Quản trị viên',
      );

    let profile = user.staffProfile;
    if (!profile) {
      profile = await this.staffProfileRepo.save({
        userId: user.id,
        fullName: user.email.split('@')[0],
        department: StaffDepartment.SUPPORT,
      });
    }

    return profile;
  }

  async updateStaffProfile(clerkUserId: string, dto: UpdateStaffProfileDto) {
    const user = await this.userRepo.findOne({
      where: { clerkUserId },
      relations: ['staffProfile'],
    });

    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    if (user.roleId !== 3 && user.roleId !== 4)
      throw new ForbiddenException(
        'Tính năng này chỉ dành cho Nhân viên hoặc Quản trị viên',
      );

    let profile = user.staffProfile;
    if (!profile) {
      profile = this.staffProfileRepo.create({ userId: user.id });
    }

    if (dto.fullName !== undefined) profile.fullName = dto.fullName;
    if (dto.phoneNumber !== undefined) profile.phoneNumber = dto.phoneNumber;
    if (dto.department !== undefined) profile.department = dto.department;

    await this.staffProfileRepo.save(profile);

    return profile;
  }

  // ─── Admin – list & detail ──────────────────────────────────────────────────

  async getKycRequests(status?: KycStatus | string) {
    const qb = this.userRepo
      .createQueryBuilder('user')
      .innerJoinAndSelect('user.instructorProfile', 'instructorProfile')
      .leftJoinAndSelect('user.instructorDocuments', 'instructorDocuments')
      .leftJoinAndSelect('user.profile', 'profile');

    if (status && status !== 'ALL') {
      qb.where('instructorProfile.kyc_status = :status', { status });
    }

    qb.orderBy('user.createdAt', 'DESC');

    const users = await qb.getMany();
    return users.map((u) => {
      const publicProfile = this.toPublicProfile(u);
      return {
        ...publicProfile,
        instructorProfile: u.instructorProfile
          ? {
              ...publicProfile.instructorProfile,
              idCardUrl: u.instructorProfile.idCardUrl,
              bankAccountName: u.instructorProfile.bankAccountName,
              bankAccountNumber: u.instructorProfile.bankAccountNumber,
            }
          : null,
      };
    });
  }

  async reviewKyc(targetId: number, status: KycStatus, reason?: string) {
    const user = await this.userRepo.findOne({
      where: { id: targetId },
      relations: ['instructorProfile', 'role'],
    });
    if (!user || !user.instructorProfile)
      throw new NotFoundException('Không tìm thấy giảng viên hoặc KYC');

    user.instructorProfile.kycStatus = status;
    user.instructorProfile.rejectionReason = reason || '';
    await this.instructorProfileRepo.save(user.instructorProfile);

    // Nếu Approve, cập nhật Role của User lên INSTRUCTOR
    if (status === KycStatus.APPROVED) {
      const instructorRole = await this.roleRepo.findOne({
        where: { roleName: 'INSTRUCTOR' },
      });
      if (instructorRole && user.roleId !== instructorRole.id) {
        user.roleId = instructorRole.id;
        user.role = instructorRole;
        await this.userRepo.save(user);

        // Sync cho Clerk SDK
        try {
          const clerk = createClerkClient({
            secretKey: process.env.CLERK_SECRET_KEY,
          });
          await clerk.users.updateUserMetadata(user.clerkUserId, {
            publicMetadata: { role: 'INSTRUCTOR' },
          });
        } catch (e: any) {
          console.warn('[reviewKyc] Failed to sync Clerk Metadata:', e.message);
        }
      }
    } else if (status === KycStatus.REJECTED) {
      // Nếu REJECTED và user vẫn chỉ trơ trọi quyền USER (chưa từng duyệt bao giờ) => xóa trắng tài khoản.
      if (user.role?.roleName === 'USER') {
        await this.deleteUser(targetId);
        return {
          message: 'Tài khoản giả mạo/không hợp lệ đã bị xóa khỏi hệ thống.',
        };
      }
    }

    return this.toPublicProfile(user);
  }

  async findAll(opts: {
    page: number;
    limit: number;
    role?: string;
    status?: string;
    search?: string;
  }): Promise<PaginatedUsers> {
    const { page, limit = 10, role, status, search } = opts;
    const skip = (page - 1) * limit;

    const qb = this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('user.instructorProfile', 'instructorProfile')
      .orderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (role) {
      qb.andWhere('role.role_name = :role', { role: role });
    }
    if (status) {
      qb.andWhere('user.status = :status', { status });
    }
    if (search) {
      qb.andWhere('user.email ILIKE :search', { search: `%${search}%` });
    }

    // Admin không quản lý Admin
    qb.andWhere('role.role_name != :adminRole', { adminRole: 'ADMIN' });

    const [users, total] = await qb.getManyAndCount();

    return {
      data: users.map((u) => this.toPublicProfile(u)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneById(id: number) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: [
        'role',
        'profile',
        'instructorProfile',
        'instructorDocuments',
      ],
    });
    if (!user) throw new NotFoundException(`Không tìm thấy user #${id}`);
    return this.toPublicProfile(user);
  }

  // ─── Admin – mutations ──────────────────────────────────────────────────────

  async updateStatus(
    targetId: number,
    dto: UpdateUserStatusDto,
    requestor: User,
  ) {
    const target = await this.userRepo.findOne({
      where: { id: targetId },
      relations: ['role'],
    });
    if (!target)
      throw new NotFoundException(`Không tìm thấy user #${targetId}`);
    if (target.id === requestor.id) {
      throw new ForbiddenException(
        'Không thể tự thay đổi trạng thái của chính mình',
      );
    }
    if (target.role?.roleName === 'ADMIN') {
      throw new ForbiddenException(
        'Không thể thay đổi trạng thái của Quản trị viên khác',
      );
    }

    target.status = dto.status;

    if (dto.status === UserStatus.ACTIVE) {
      // Unban: xóa lý do ban, ghi thời điểm unban
      target.banReason = null;
      target.bannedAt = null;
      target.unbannedAt = new Date();
    } else {
      // Ban/Suspend thủ công: ghi lý do và thời điểm ban
      target.banReason = dto.reason ?? null;
      target.bannedAt = new Date();
      target.unbannedAt = null;
    }

    await this.userRepo.save(target);
    return this.toPublicProfile(target);
  }

  async incrementViolationCount(userId: number, reason: string): Promise<any> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['role'],
    });
    if (!user) throw new NotFoundException(`Không tìm thấy user #${userId}`);

    user.violationCount += 1;

    // Tự động suspend khi đạt ngưỡng >= 2 vi phạm
    if (user.violationCount >= 2 && user.status === UserStatus.ACTIVE) {
      user.status = UserStatus.SUSPENDED;
      user.banReason = `Hệ thống tự động đình chỉ: tài khoản đạt ${user.violationCount} lần vi phạm. Lý do gần nhất: ${reason}`;
      user.bannedAt = new Date();
      user.unbannedAt = null;
    }

    await this.userRepo.save(user);
    return this.toPublicProfile(user);
  }

  async updateRole(targetId: number, dto: UpdateUserRoleDto, requestor: User) {
    const target = await this.userRepo.findOne({
      where: { id: targetId },
      relations: ['role'],
    });
    if (!target)
      throw new NotFoundException(`Không tìm thấy user #${targetId}`);
    if (target.id === requestor.id) {
      throw new ForbiddenException('Không thể tự thay đổi role của chính mình');
    }
    if (target.role?.roleName === 'ADMIN') {
      throw new ForbiddenException(
        'Không thể thay đổi role của Quản trị viên khác',
      );
    }

    const role = await this.roleRepo.findOne({ where: { id: dto.roleId } });
    if (!role)
      throw new NotFoundException(`Không tìm thấy role #${dto.roleId}`);

    target.roleId = role.id;
    target.role = role;
    await this.userRepo.save(target);
    return this.toPublicProfile(target);
  }

  async getPublicPortfolio(userId: number, query?: { page?: number; limit?: number }) {
    const page = Number(query?.page) || 1;
    const limit = Number(query?.limit) || 6;
    const skip = (page - 1) * limit;

    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: [
        'role',
        'profile',
        'instructorProfile',
        'courses',
        'courses.category',
      ],
    });

    if (!user) throw new NotFoundException('Không tìm thấy giảng viên');
    if (user.role?.roleName !== 'INSTRUCTOR') {
      throw new ForbiddenException('Người dùng này không phải là giảng viên');
    }

    return {
      id: user.id,
      fullName: user.profile?.fullName ?? 'Giảng viên StudyMate',
      avatarUrl: user.avatarUrl,
      bio: user.profile?.bio ?? 'Chưa có thông tin giới thiệu.',
      certificates: user.instructorProfile?.certificates || [],
      courses: (user.courses || [])
        .filter((c) => c.status === 'PUBLISHED')
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(skip, skip + limit)
        .map((c) => ({
          id: c.id,
          title: c.title,
          slug: c.slug,
          thumbnailUrl: c.thumbnailUrl,
          price: Number(c.price),
          level: c.level,
          categoryName: c.category?.name,
        })),
      totalCourses: (user.courses || []).filter((c) => c.status === 'PUBLISHED')
        .length,
      createdAt: user.createdAt,
    };
  }

  // ─── Xóa User ───────────────────────────────────────────────────────────────

  async deleteUser(id: number, requestor?: User) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['role'],
    });
    if (!user) {
      throw new NotFoundException(`Không tìm thấy user #${id}`);
    }
    if (user.role?.roleName === 'ADMIN') {
      throw new ForbiddenException('Không thể xóa Quản trị viên khác');
    }

    // 1. Xóa trên Clerk để giải phóng Email
    try {
      const clerk = createClerkClient({
        secretKey: process.env.CLERK_SECRET_KEY,
      });
      await clerk.users.deleteUser(user.clerkUserId);
    } catch (error: any) {
      console.warn(
        `[deleteUser] Lỗi hoặc user không tồn tại trên Clerk:`,
        error.message,
      );
      // Vẫn tiếp tục thực hiện xóa local để đảm bảo đồng bộ
    }

    // 2. Xóa trong CSDL Local (Soft delete - cập nhật status hoặc deleteDate)
    await this.userRepo.softDelete(id);
    return { id };
  }

  // ─── Helper ─────────────────────────────────────────────────────────────────

  private toPublicProfile(user: User) {
    const fName = user.profile?.fullName
      ? user.profile.fullName.split(' ')[0]
      : null;
    const lName = user.profile?.fullName
      ? user.profile.fullName.split(' ').slice(1).join(' ')
      : null;

    return {
      id: user.id,
      clerkUserId: user.clerkUserId,
      email: user.email,
      firstName: fName,
      lastName: lName,
      fullName: user.profile?.fullName ?? null,
      bio: user.profile?.bio ?? null,
      avatarUrl: user.avatarUrl ?? null,
      role: user.role?.roleName ?? null,
      roleId: user.roleId,
      status: user.status,
      violationCount: user.violationCount,
      banReason: user.banReason ?? null,
      bannedAt: user.bannedAt ?? null,
      unbannedAt: user.unbannedAt ?? null,
      instructorProfile: user.instructorProfile
        ? {
            bankName: user.instructorProfile.bankName,
            kycStatus: user.instructorProfile.kycStatus,
            certificates: user.instructorProfile.certificates,
            documents: user.instructorDocuments || [],
          }
        : null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
