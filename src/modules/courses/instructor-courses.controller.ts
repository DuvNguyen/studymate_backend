import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CourseQueryDto } from './dto/course-query.dto';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';

@Controller('instructor/courses')
@UseGuards(ClerkAuthGuard, RolesGuard)
@Roles('INSTRUCTOR', 'ADMIN') // Cho phép cả ADMIN sửa nếu cần
export class InstructorCoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  async getMyCourses(
    @CurrentUser() user: User,
    @Query() query: CourseQueryDto,
  ) {
    return this.coursesService.findByInstructor(user.id, query);
  }

  @Patch(':id/archive')
  async archiveCourse(@CurrentUser() user: User, @Param('id') id: number) {
    await this.coursesService.archiveCourse(user.id, id);
    return { success: true, message: 'Khóa học đã được đưa vào lưu trữ' };
  }

  @Patch(':id/unarchive')
  async unarchiveCourse(@CurrentUser() user: User, @Param('id') id: number) {
    await this.coursesService.unarchiveCourse(user.id, id);
    return { success: true, message: 'Khóa học đã được mở lưu trữ' };
  }

  @Post()
  async createCourse(@CurrentUser() user: User, @Body() dto: CreateCourseDto) {
    return this.coursesService.createCourse(user.id, dto);
  }

  @Get(':id')
  async getCourseDetail(@CurrentUser() user: User, @Param('id') id: number) {
    return this.coursesService.findInstructorCourseDetail(user.id, id);
  }

  @Put(':id')
  async updateCourse(
    @CurrentUser() user: User,
    @Param('id') id: number,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.coursesService.updateCourse(user.id, id, dto);
  }

  @Put(':id/submit')
  async submitForReview(@CurrentUser() user: User, @Param('id') id: number) {
    return this.coursesService.submitCourseForReview(user.id, id);
  }
}
