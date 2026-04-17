import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { LessonProgressService } from './lesson-progress.service';
import { UpsertProgressDto } from './dto/upsert-progress-request.dto';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';

@Controller('lesson-progress')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class LessonProgressController {
  constructor(private readonly progressService: LessonProgressService) {}

  @Post()
  async upsert(@CurrentUser() user: User, @Body() dto: UpsertProgressDto) {
    return this.progressService.upsertProgress(user, dto);
  }

  @Get('enrollment/:enrollmentId')
  async getByEnrollment(@Param('enrollmentId') enrollmentId: number) {
    return this.progressService.getEnrollmentProgress(enrollmentId);
  }
}
