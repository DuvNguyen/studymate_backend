import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { ClerkUserId } from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // GET /api/v1/auth/me
  // Frontend gọi sau khi đăng nhập để lấy thông tin user
  @Get('me')
  @UseGuards(ClerkAuthGuard)
  async getMe(@ClerkUserId() clerkUserId: string) {
    const user = await this.authService.getMe(clerkUserId);
    return {
      data: user,
      message: 'Lấy thông tin người dùng thành công',
    };
  }

  // POST /api/v1/auth/onboard
  // Được trigger sau khi User đăng ký qua luồng riêng, để gắn chặt role
  @Post('onboard')
  @UseGuards(ClerkAuthGuard)
  async onboardUser(
    @ClerkUserId() clerkUserId: string,
    @Body('role') role: string,
  ) {
    const result = await this.authService.onboardUser(clerkUserId, role);
    return {
      data: result,
      message: 'Thiết lập định danh role thành công',
    };
  }

  // GET /api/v1/auth/health
  // Kiểm tra server có chạy không (không cần auth)
  @Get('health')
  health() {
    return {
      data: { status: 'ok', timestamp: new Date().toISOString() },
      message: 'Server đang hoạt động',
    };
  }
}
