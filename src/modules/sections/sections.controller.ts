import {
  Controller,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { SectionsService } from './sections.service';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('instructor')
@UseGuards(ClerkAuthGuard, RolesGuard)
@Roles('INSTRUCTOR', 'ADMIN')
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @Post('courses/:courseId/sections')
  async createSection(
    @CurrentUser('id') userId: number,
    @Param('courseId') courseId: number,
    @Body() dto: { title: string; position?: number },
  ) {
    return this.sectionsService.createSection(userId, courseId, dto);
  }

  @Put('sections/:id')
  async updateSection(
    @CurrentUser('id') userId: number,
    @Param('id') id: number,
    @Body() dto: { title?: string; position?: number },
  ) {
    return this.sectionsService.updateSection(userId, id, dto);
  }

  @Delete('sections/:id')
  async deleteSection(
    @CurrentUser('id') userId: number,
    @Param('id') id: number,
  ) {
    return this.sectionsService.deleteSection(userId, id);
  }
}
