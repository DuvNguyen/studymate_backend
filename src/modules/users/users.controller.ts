import {
  Controller,
  Get,
  Patch,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { ClerkUserId, CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateKycDto } from './dto/update-kyc.dto';
import { UpdateStaffProfileDto } from './dto/update-staff-profile.dto';
import { UpdateUserStatusDto, UpdateUserRoleDto } from './dto/update-user-admin.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { User } from '../../database/entities/user.entity';

@Controller('users')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ─── Profile bản thân ───────────────────────────────────────────────────────

  /** GET /api/v1/users/me */
  @Get('me')
  async getProfile(@ClerkUserId() clerkUserId: string) {
    const profile = await this.usersService.getProfile(clerkUserId);
    return { data: profile, message: 'Lấy profile thành công' };
  }

  /** PATCH /api/v1/users/me */
  @Patch('me')
  async updateProfile(
    @ClerkUserId() clerkUserId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    const profile = await this.usersService.updateProfile(clerkUserId, dto);
    return { data: profile, message: 'Cập nhật profile thành công' };
  }

  // ─── KYC (Giảng viên) ──────────────────────────────────────────────────────

  /** GET /api/v1/users/me/kyc */
  @Get('me/kyc')
  async getKyc(@ClerkUserId() clerkUserId: string) {
    const kycData = await this.usersService.getInstructorKyc(clerkUserId);
    return { data: kycData, message: 'Lấy thông tin KYC thành công' };
  }

  /** PUT /api/v1/users/me/kyc */
  @Put('me/kyc')
  async updateKyc(
    @ClerkUserId() clerkUserId: string,
    @Body() dto: UpdateKycDto,
  ) {
    const kycData = await this.usersService.updateInstructorKyc(clerkUserId, dto);
    return { data: kycData, message: 'Cập nhật KYC thành công' };
  }

  // ─── Staff Profile ─────────────────────────────────────────────────────────

  /** GET /api/v1/users/me/staff */
  @Get('me/staff')
  async getStaffProfile(@ClerkUserId() clerkUserId: string) {
    const profile = await this.usersService.getStaffProfile(clerkUserId);
    return { data: profile, message: 'Lấy thông tin nhân viên thành công' };
  }

  /** PUT /api/v1/users/me/staff */
  @Put('me/staff')
  async updateStaffProfile(
    @ClerkUserId() clerkUserId: string,
    @Body() dto: UpdateStaffProfileDto,
  ) {
    const profile = await this.usersService.updateStaffProfile(clerkUserId, dto);
    return { data: profile, message: 'Cập nhật thông tin nhân viên thành công' };
  }

  // ─── Admin – danh sách & chi tiết ──────────────────────────────────────────

  /**
   * GET /api/v1/users
   * Query: page, limit, role, status, search
   */
  @Roles('ADMIN', 'STAFF')
  @Get()
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const result = await this.usersService.findAll({
      page,
      limit: Math.min(limit, 100),
      role,
      status,
      search,
    });
    return { ...result, message: 'Lấy danh sách người dùng thành công' };
  }

  /** GET /api/v1/users/:id */
  @Roles('ADMIN', 'STAFF')
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findOneById(id);
    return { data: user, message: 'Lấy thông tin người dùng thành công' };
  }

  // ─── Admin – mutations ──────────────────────────────────────────────────────

  /** PATCH /api/v1/users/:id/status */
  @Roles('ADMIN')
  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() requestor: User,
  ) {
    const user = await this.usersService.updateStatus(id, dto, requestor);
    return { data: user, message: 'Cập nhật trạng thái thành công' };
  }

  /** PATCH /api/v1/users/:id/role */
  @Roles('ADMIN')
  @Patch(':id/role')
  async updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() requestor: User,
  ) {
    const user = await this.usersService.updateRole(id, dto, requestor);
    return { data: user, message: 'Cập nhật role thành công' };
  }

  /** DELETE /api/v1/users/:id */
  @Roles('ADMIN')
  @Delete(':id')
  async deleteUser(@Param('id', ParseIntPipe) id: number) {
    const result = await this.usersService.deleteUser(id);
    return { data: result, message: 'Xóa hệ thống và Clerk thành công' };
  }
}
