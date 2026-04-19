import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';
import { EnrollmentResponseDto } from './dto/enrollment-response.dto';

@Controller('enrollments')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Get('my-courses')
  async getMyCourses(
    @CurrentUser() user: User,
  ): Promise<EnrollmentResponseDto[]> {
    return this.enrollmentsService.findMyCourses(user);
  }

  @Get('my-purchases')
  async getMyPurchases(
    @CurrentUser() user: User,
  ): Promise<EnrollmentResponseDto[]> {
    return this.enrollmentsService.findMyPurchases(user);
  }

  @Post('direct')
  @Roles('ADMIN', 'STAFF')
  async directEnroll(
    @CurrentUser() user: User,
    @Body('courseId') courseId: number,
    @Body('studentId') studentId?: number,
  ): Promise<EnrollmentResponseDto> {
    if (!courseId) throw new BadRequestException('Thiếu courseId');
    return this.enrollmentsService.directEnroll(courseId, user, studentId);
  }
}
