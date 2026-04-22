import { Controller, Get, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';
import { CoursesService } from './courses.service';
import { CourseQueryDto } from './dto/course-query.dto';
import {
  CourseResponseDto,
  PaginatedCoursesDto,
} from './dto/course-response.dto';

@Controller('courses')
@UseInterceptors(CacheInterceptor)
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  /**
   * GET /api/v1/courses
   * Public endpoint — không cần auth.
   * Query params: categorySlug, search, level, page, limit
   */
  @Get()
  @CacheTTL(600 * 1000) // 10 minutes in ms
  async findAll(@Query() query: CourseQueryDto): Promise<PaginatedCoursesDto> {
    return this.coursesService.findPublicCourses(query);
  }

  @Get('suggest')
  async suggest(@Query('q') q: string) {
    return this.coursesService.suggestCourses(q);
  }

  /**
   * GET /api/v1/courses/:slug
   * Lấy chi tiết khóa học theo slug — public.
   */
  @Get(':slug')
  @CacheTTL(60 * 1000) // 60 seconds in ms
  async findOne(@Param('slug') slug: string): Promise<CourseResponseDto> {
    console.log(`[CoursesController] findOne called for slug: ${slug}`);
    return this.coursesService.findBySlug(slug);
  }

  /**
   * GET /api/v1/courses/:slug/learn
   * Lấy chi tiết học tập (kèm tất cả video) — yêu cầu đăng ký.
   */
  @Get(':slug/learn')
  @UseGuards(ClerkAuthGuard, RolesGuard)
  async findOneForLearn(
    @CurrentUser() user: User,
    @Param('slug') slug: string,
  ): Promise<CourseResponseDto> {
    return this.coursesService.findCourseForLearn(user.id, slug);
  }
}
