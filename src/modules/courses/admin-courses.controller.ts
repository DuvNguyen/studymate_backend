import {
  Controller,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
  Body,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RejectCourseDto } from './dto/course-approval.dto';
import { CourseQueryDto } from './dto/course-query.dto';

@Controller('admin/courses')
@UseGuards(ClerkAuthGuard, RolesGuard)
@Roles('ADMIN', 'STAFF')
export class AdminCoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  async getCourses(@Query() query: CourseQueryDto) {
    return this.coursesService.findAllForAdmin(query);
  }

  @Put(':id/suspend')
  async suspendCourse(@Param('id') id: string, @Body() dto: RejectCourseDto) {
    return this.coursesService.suspendCourse(parseInt(id, 10), dto);
  }

  @Put(':id/approve')
  async approveCourse(@Param('id') id: string) {
    return this.coursesService.approveCourse(parseInt(id, 10));
  }

  @Put(':id/reject')
  async rejectCourse(@Param('id') id: string, @Body() dto: RejectCourseDto) {
    return this.coursesService.rejectCourse(parseInt(id, 10), dto);
  }
}
