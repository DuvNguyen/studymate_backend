import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
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
import { NotificationsService } from '../notifications/notifications.service';
import { SearchService } from '../search/search.service';
import { NotificationType } from '../../database/entities/notification.entity';

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
    private notificationsService: NotificationsService,
    @Inject(forwardRef(() => SearchService))
    private searchService: SearchService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async findOneByClerkId(clerkUserId: string): Promise<User | null> {
    const cacheKey = `user_clerk_${clerkUserId}`;
    const cachedUser = await this.cacheManager.get<User>(cacheKey);
    if (cachedUser) return cachedUser;

    const user = await this.userRepo.findOne({
      where: { clerkUserId },
      relations: ['role'],
    });

    if (user) {
      await this.cacheManager.set(cacheKey, user, 300 * 1000); // 5 minutes
    }
    return user;
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

    // Invalidate cache
    await this.cacheManager.del(`user_clerk_${clerkUserId}`);
    await this.cacheManager.del(`user_auth_${clerkUserId}`);

    // Sync to Meilisearch
    await this.searchService.indexUser(this.toSearchDocument(user));

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
      pendingData: profile.pendingData,
    };
  }

  async updateInstructorKyc(clerkUserId: string, dto: UpdateKycDto) {
    console.log('updateInstructorKyc DTO:', JSON.stringify(dto, null, 2));
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

    if (profile.kycStatus === KycStatus.APPROVED) {
      // Nếu đã APPROVED, lưu vào pending_data để Admin duyệt
      profile.pendingData = { ...dto };
      profile.kycStatus = KycStatus.PENDING_UPDATE;
      await this.instructorProfileRepo.save(profile);
    } else {
      // Chưa được duyệt hoặc bị từ chối -> Cập nhật trực tiếp
      if (dto.idCardUrl !== undefined) profile.idCardUrl = dto.idCardUrl;
      if (dto.bankAccountName !== undefined)
        profile.bankAccountName = dto.bankAccountName;
      if (dto.bankAccountNumber !== undefined)
        profile.bankAccountNumber = dto.bankAccountNumber;
      if (dto.bankName !== undefined) profile.bankName = dto.bankName;
      if (dto.certificates !== undefined) profile.certificates = dto.certificates;

      profile.kycStatus = KycStatus.PENDING;
      profile.rejectionReason = ''; // Clear lý do cũ nếu có
      await this.instructorProfileRepo.save(profile);

      // Cập nhật Document: Xoá cũ, Thêm mới (Chỉ áp dụng cho Initial/Rejected)
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
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('user.role', 'role');

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

    const oldStatus = user.instructorProfile.kycStatus;

    if (oldStatus === KycStatus.PENDING_UPDATE && status === KycStatus.APPROVED) {
      // Duyệt Cập nhật: Merge pendingData vào profile chính
      const pData = user.instructorProfile.pendingData;
      if (pData) {
        if (pData.idCardUrl !== undefined)
          user.instructorProfile.idCardUrl = pData.idCardUrl;
        if (pData.bankAccountName !== undefined)
          user.instructorProfile.bankAccountName = pData.bankAccountName;
        if (pData.bankAccountNumber !== undefined)
          user.instructorProfile.bankAccountNumber = pData.bankAccountNumber;
        if (pData.bankName !== undefined)
          user.instructorProfile.bankName = pData.bankName;
        if (pData.certificates !== undefined)
          user.instructorProfile.certificates = pData.certificates;

        // Cập nhật documents nếu có
        if (pData.documents && pData.documents.length > 0) {
          await this.instructorDocumentRepo.delete({ userId: user.id });
          const newDocs = pData.documents.map((doc: any) =>
            this.instructorDocumentRepo.create({
              userId: user.id,
              ...doc,
            }),
          );
          await this.instructorDocumentRepo.save(newDocs);
        }
      }
      user.instructorProfile.pendingData = null;
      user.instructorProfile.kycStatus = KycStatus.APPROVED;
    } else if (
      oldStatus === KycStatus.PENDING_UPDATE &&
      status === KycStatus.REJECTED
    ) {
      // Từ chối Cập nhật: Xoá pendingData, giữ lại dữ liệu cũ đã Approved
      user.instructorProfile.pendingData = null;
      user.instructorProfile.kycStatus = KycStatus.APPROVED;
      user.instructorProfile.rejectionReason = reason || 'Cập nhật bị từ chối';
      await this.instructorProfileRepo.save(user.instructorProfile);
      // Gửi thông báo từ chối cập nhật (Logic thông báo ở dưới)
    } else {
      // Trường hợp Duyệt mới (Initial) hoặc duyệt lại từ Rejected
      user.instructorProfile.kycStatus = status;
      user.instructorProfile.rejectionReason = reason || '';
    }

    if (oldStatus !== KycStatus.PENDING_UPDATE || status === KycStatus.APPROVED) {
      await this.instructorProfileRepo.save(user.instructorProfile);
    }

    // Nếu Approve, cập nhật Role của User lên INSTRUCTOR
    if (status === KycStatus.APPROVED) {
      const instructorRole = await this.roleRepo.findOne({
        where: { roleName: 'INSTRUCTOR' },
      });
      if (instructorRole && user.roleId !== instructorRole.id) {
        user.roleId = instructorRole.id;
        user.role = instructorRole;
        await this.userRepo.save(user);
        
        // Invalidate cache
        await this.cacheManager.del(`user_clerk_${user.clerkUserId}`);
        await this.cacheManager.del(`user_auth_${user.clerkUserId}`);

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

    // Send KYC notification
    if (status === KycStatus.APPROVED) {
      await this.notificationsService.sendNotification(
        targetId,
        NotificationType.KYC,
        'Hồ sơ đã được xác minh!',
        'Hồ sơ giảng viên của bạn đã được xác minh thành công. Bạn đã có thể thực hiện rút tiền.',
        { kycStatus: 'APPROVED' },
      );
    } else if (status === KycStatus.REJECTED && user.role?.roleName !== 'USER') {
      await this.notificationsService.sendNotification(
        targetId,
        NotificationType.KYC,
        'Hồ sơ cần chỉnh sửa',
        `Hồ sơ giảng viên cần chỉnh sửa thêm. Lý do: ${reason || 'Không rõ'}`,
        { kycStatus: 'REJECTED', reason },
      );
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

    if (search) {
      // Use Meilisearch for Admin user search
      const searchOptions: any = {
        limit,
        offset: skip,
        filter: [`role != "ADMIN"`], // Admin doesn't manage other admins as per original logic
      };

      if (role) {
        searchOptions.filter.push(`role = "${role}"`);
      }
      if (status) {
        searchOptions.filter.push(`status = "${status}"`);
      }

      const searchResult = await this.searchService.searchUsers(search, searchOptions);
      const total = (searchResult as any).totalHits || (searchResult as any).estimatedTotalHits || searchResult.hits.length || 0;

      const users = await this.userRepo.find({
        where: { id: In(searchResult.hits.map(h => h.id)) },
        relations: ['role', 'profile', 'instructorProfile'],
      });

      // Maintain order
      const orderedUsers = searchResult.hits.map(hit => users.find(u => u.id === hit.id)).filter(Boolean);

      return {
        data: (orderedUsers as User[]).map((u) => this.toPublicProfile(u)),
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    if (role) {
      qb.andWhere('role.role_name = :role', { role: role });
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
    
    // Invalidate cache
    await this.cacheManager.del(`user_clerk_${target.clerkUserId}`);
    await this.cacheManager.del(`user_auth_${target.clerkUserId}`);
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
        'instructorDocuments',
        'courses',
        'courses.category',
      ],
    });

    if (!user) throw new NotFoundException('Không tìm thấy giảng viên');
    if (user.role?.roleName !== 'INSTRUCTOR') {
      throw new ForbiddenException('Người dùng này không phải là giảng viên');
    }

    // Sync with Clerk to ensure name/avatar are up to date
    let fullName = user.profile?.fullName || user.email || 'Giảng viên StudyMate';
    let avatarUrl = user.avatarUrl;

    try {
      const clerk = createClerkClient({
        secretKey: process.env.CLERK_SECRET_KEY,
      });
      const clerkUser = await clerk.users.getUser(user.clerkUserId);
      const clerkFullName = (clerkUser.firstName + ' ' + clerkUser.lastName).trim();
      
      let updated = false;
      if (clerkFullName && user.profile?.fullName !== clerkFullName) {
        if (!user.profile) {
          user.profile = this.profileRepo.create({ userId: user.id, fullName: clerkFullName });
        } else {
          user.profile.fullName = clerkFullName;
        }
        await this.profileRepo.save(user.profile);
        fullName = clerkFullName;
        updated = true;
      }
      if (clerkUser.imageUrl && user.avatarUrl !== clerkUser.imageUrl) {
        user.avatarUrl = clerkUser.imageUrl;
        avatarUrl = clerkUser.imageUrl;
        updated = true;
      }
      if (updated) {
        await this.userRepo.save(user);
      }
    } catch (e) {
      console.warn(`[getPublicPortfolio] Failed to sync with Clerk for ${user.clerkUserId}:`, e.message);
    }

    // Combine manual certificates with verified documents
    const rawManualCerts = user.instructorProfile?.certificates || [];
    const manualCerts = rawManualCerts.map(cert => {
      if (typeof cert === 'string') {
        const [name, url] = cert.split(':');
        return { name: name || cert, url: url || null };
      }
      return cert;
    });

    const verifiedDocs = (user.instructorDocuments || [])
      .filter(doc => doc.isVerified)
      .map(doc => ({
        name: doc.title,
        url: doc.fileUrl,
        type: doc.documentType
      }));

    return {
      id: user.id,
      fullName,
      avatarUrl,
      bio: user.profile?.bio ?? 'Chưa có thông tin giới thiệu.',
      certificates: [...manualCerts, ...verifiedDocs],
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

    // 2. Xóa trong CSDL Local (Soft delete)
    await this.userRepo.softDelete(id);

    // Invalidate cache
    await this.cacheManager.del(`user_clerk_${user.clerkUserId}`);
    await this.cacheManager.del(`user_auth_${user.clerkUserId}`);
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
      fullName: user.profile?.fullName || user.email || null,
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
            bankAccountName: user.instructorProfile.bankAccountName,
            bankAccountNumber: user.instructorProfile.bankAccountNumber,
            idCardUrl: user.instructorProfile.idCardUrl,
            kycStatus: user.instructorProfile.kycStatus,
            rejectionReason: user.instructorProfile.rejectionReason,
            certificates: user.instructorProfile.certificates,
            pendingData: user.instructorProfile.pendingData,
            documents: user.instructorDocuments || [],
          }
        : null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Sync all users to Meilisearch.
   */
  async syncAllToMeili(): Promise<void> {
    const users = await this.userRepo.find({
      relations: ['role', 'profile'],
    });

    if (users.length > 0) {
      const docs = users.map((user) => this.toSearchDocument(user));
      await this.searchService.indexUsers(docs);
      console.log(`Synced ${docs.length} users to Meilisearch.`);
    } else {
      console.log('No users found to sync.');
    }
  }

  private toSearchDocument(user: User) {
    return {
      id: user.id,
      fullName: user.profile?.fullName || user.email || null,
      email: user.email,
      role: user.role?.roleName || null,
      status: user.status,
      createdAt: user.createdAt.getTime(),
    };
  }
}
