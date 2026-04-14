import { Controller, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { SectionsService } from './sections.service';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('instructor')
@UseGuards(ClerkAuthGuard, RolesGuard)
@Roles('INSTRUCTOR', 'ADMIN')
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @Post('courses/:courseId/sections')
  async createSection(
    @Req() req,
    @Param('courseId') courseId: number,
    @Body() dto: { title: string; position?: number },
  ) {
    return this.sectionsService.createSection(req.user.id, courseId, dto);
  }

  @Put('sections/:id')
  async updateSection(
    @Req() req,
    @Param('id') id: number,
    @Body() dto: { title?: string; position?: number },
  ) {
    return this.sectionsService.updateSection(req.user.id, id, dto);
  }

  @Delete('sections/:id')
  async deleteSection(@Req() req, @Param('id') id: number) {
    return this.sectionsService.deleteSection(req.user.id, id);
  }
}
