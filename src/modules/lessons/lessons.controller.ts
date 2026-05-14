import {
  Controller,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('instructor')
@UseGuards(ClerkAuthGuard, RolesGuard)
@Roles('INSTRUCTOR', 'ADMIN')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Post('sections/:sectionId/lessons')
  async createLesson(
    @CurrentUser('id') userId: number,
    @Param('sectionId') sectionId: number,
    @Body()
    dto: {
      title: string;
      videoId?: number;
      content?: string;
      isPreview?: boolean;
      position?: number;
    },
  ) {
    return this.lessonsService.createLesson(userId, sectionId, dto);
  }

  @Put('lessons/:id')
  async updateLesson(
    @CurrentUser('id') userId: number,
    @Param('id') id: number,
    @Body()
    dto: {
      title?: string;
      videoId?: number;
      content?: string;
      isPreview?: boolean;
      position?: number;
    },
  ) {
    return this.lessonsService.updateLesson(userId, id, dto);
  }

  @Delete('lessons/:id')
  async deleteLesson(
    @CurrentUser('id') userId: number,
    @Param('id') id: number,
  ) {
    return this.lessonsService.deleteLesson(userId, id);
  }
}
