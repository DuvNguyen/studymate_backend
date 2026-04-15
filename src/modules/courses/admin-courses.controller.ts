import { Controller, Get, Param, Put, Query, UseGuards, Req, Body } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CourseStatus } from '../../database/entities/course.entity';
import { RejectCourseDto } from './dto/course-approval.dto';

@Controller('admin/courses')
@UseGuards(ClerkAuthGuard, RolesGuard)
@Roles('ADMIN', 'STAFF')
export class AdminCoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  async getCourses(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('status') status: CourseStatus,
  ) {
    return this.coursesService.findAllForAdmin(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
      status,
    );
  }

  @Put(':id/approve')
  async approveCourse(@Req() req, @Param('id') id: string) {
    return this.coursesService.approveCourse(parseInt(id, 10), req.user.id);
  }

  @Put(':id/reject')
  async rejectCourse(@Req() req, @Param('id') id: string, @Body() dto: RejectCourseDto) {
    return this.coursesService.rejectCourse(parseInt(id, 10), req.user.id, dto);
  }
}
