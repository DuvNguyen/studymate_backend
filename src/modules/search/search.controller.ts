import { Controller, Post, Inject, forwardRef, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CoursesService } from '../courses/courses.service';
import { UsersService } from '../users/users.service';

@Controller('search')
export class SearchController {
  constructor(
    @Inject(forwardRef(() => CoursesService))
    private readonly coursesService: CoursesService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  @Post('sync')
  @UseGuards(ClerkAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async syncAll() {
    await this.coursesService.syncAllToMeili();
    await this.usersService.syncAllToMeili();
    return { message: 'Synchronization started' };
  }
}
