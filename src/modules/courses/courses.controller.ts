import { Controller, Get, Param, Query } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CourseQueryDto } from './dto/course-query.dto';
import { CourseResponseDto, PaginatedCoursesDto } from './dto/course-response.dto';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  /**
   * GET /api/v1/courses
   * Public endpoint — không cần auth.
   * Query params: categorySlug, search, level, page, limit
   */
  @Get()
  async findAll(@Query() query: CourseQueryDto): Promise<PaginatedCoursesDto> {
    return this.coursesService.findPublicCourses(query);
  }

  /**
   * GET /api/v1/courses/:slug
   * Lấy chi tiết khóa học theo slug — public.
   */
  @Get(':slug')
  async findOne(@Param('slug') slug: string): Promise<CourseResponseDto> {
    return this.coursesService.findBySlug(slug);
  }
}
