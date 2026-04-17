import {
  Controller,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('instructor')
@UseGuards(ClerkAuthGuard, RolesGuard)
@Roles('INSTRUCTOR', 'ADMIN')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Post('sections/:sectionId/lessons')
  async createLesson(
    @Req() req,
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
    return this.lessonsService.createLesson(req.user.id, sectionId, dto);
  }

  @Put('lessons/:id')
  async updateLesson(
    @Req() req,
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
    return this.lessonsService.updateLesson(req.user.id, id, dto);
  }

  @Delete('lessons/:id')
  async deleteLesson(@Req() req, @Param('id') id: number) {
    return this.lessonsService.deleteLesson(req.user.id, id);
  }
}
