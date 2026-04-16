import { Controller, Get, UseGuards } from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';
import { EnrollmentResponseDto } from './dto/enrollment-response.dto';

@Controller('enrollments')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Get('my-courses')
  async getMyCourses(@CurrentUser() user: User): Promise<EnrollmentResponseDto[]> {
    return this.enrollmentsService.findMyCourses(user);
  }
}
