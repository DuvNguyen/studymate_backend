import { Controller, Get, Post, Put, Body, Param, UseGuards, Req } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('instructor/courses')
@UseGuards(ClerkAuthGuard, RolesGuard)
@Roles('INSTRUCTOR', 'ADMIN') // Cho phép cả ADMIN sửa nếu cần
export class InstructorCoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  async getMyCourses(@Req() req) {
    return this.coursesService.findByInstructor(req.user.id);
  }

  @Post()
  async createCourse(@Req() req, @Body() dto: CreateCourseDto) {
    return this.coursesService.createCourse(req.user.id, dto);
  }

  @Get(':id')
  async getCourseDetail(@Req() req, @Param('id') id: number) {
    return this.coursesService.findInstructorCourseDetail(req.user.id, id);
  }

  @Put(':id')
  async updateCourse(
    @Req() req,
    @Param('id') id: number,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.coursesService.updateCourse(req.user.id, id, dto);
  }

  @Put(':id/submit')
  async submitForReview(@Req() req, @Param('id') id: number) {
    return this.coursesService.submitCourseForReview(req.user.id, id);
  }
}
