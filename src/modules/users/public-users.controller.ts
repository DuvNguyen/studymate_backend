import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class PublicUsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /api/v1/users/:id/portfolio
   * Public endpoint — no auth required.
   */
  @Get(':id/portfolio')
  async getPublicPortfolio(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const data = await this.usersService.getPublicPortfolio(id, { page, limit });
    return { data, message: 'Lấy thông tin giảng viên thành công' };
  }
}
