import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';

@Controller('wishlist')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  async findAll(@CurrentUser() user: User) {
    const data = await this.wishlistService.findAll(user.id);
    return { data, message: 'Lấy danh sách yêu thích thành công' };
  }

  @Post(':courseId')
  async toggle(
    @CurrentUser() user: User,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Body('status') status?: boolean,
  ) {
    const result = await this.wishlistService.toggleWishlist(user.id, courseId, status);
    return { 
      data: result, 
      message: result.isInWishlist ? 'Đã thêm vào danh sách yêu thích' : 'Đã xóa khỏi danh sách yêu thích' 
    };
  }

  @Get('check/:courseId')
  async check(
    @CurrentUser() user: User,
    @Param('courseId', ParseIntPipe) courseId: number,
  ) {
    const result = await this.wishlistService.checkWishlist(user.id, courseId);
    return { data: result, message: 'Kiểm tra trạng thái yêu thích thành công' };
  }
}
