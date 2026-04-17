import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';
import { DiscussionsService } from './discussions.service';
import { CreateDiscussionDto } from './dto/create-discussion-request.dto';
import { UpdateDiscussionDto } from './dto/update-discussion-request.dto';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('discussions')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class DiscussionsController {
  constructor(private readonly discussionsService: DiscussionsService) {}

  @Post()
  async create(@CurrentUser() user: User, @Body() dto: CreateDiscussionDto) {
    return this.discussionsService.create(user, dto);
  }

  @Get('lesson/:lessonId')
  async getLesson(@Param('lessonId') lessonId: number) {
    return this.discussionsService.getLessonDiscussions(lessonId);
  }

  @Patch(':id/best-answer')
  @Roles('INSTRUCTOR', 'STAFF', 'ADMIN')
  async markBestAnswer(@CurrentUser() user: User, @Param('id') id: number) {
    return this.discussionsService.markBestAnswer(id, user);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: User, @Param('id') id: number) {
    return this.discussionsService.softDelete(id, user);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: User,
    @Param('id') id: number,
    @Body() dto: UpdateDiscussionDto,
  ) {
    return this.discussionsService.update(id, dto.content, user);
  }

  @Get('course/:courseId/search')
  async search(@Param('courseId') courseId: number, @Query('q') q: string) {
    return this.discussionsService.search(courseId, q);
  }
}
