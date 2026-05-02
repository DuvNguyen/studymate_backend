import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
} from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { ReviewsService } from './reviews.service';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';

@Controller('api/v1/reviews')
@UseInterceptors(CacheInterceptor)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('course/:courseId')
  @CacheTTL(600 * 1000) // 10 minutes in ms
  async getCourseReviews(@Param('courseId') courseId: string) {
    return this.reviewsService.findAllByCourse(+courseId);
  }

  @Post()
  @UseGuards(ClerkAuthGuard)
  async create(
    @Body() data: { courseId: number; rating: number; comment?: string },
    @CurrentUser() user: User,
  ) {
    return this.reviewsService.create(data, user);
  }

  @Delete(':id')
  @UseGuards(ClerkAuthGuard)
  async delete(@Param('id') id: string, @CurrentUser() user: User) {
    return this.reviewsService.delete(+id, user.id);
  }
}
