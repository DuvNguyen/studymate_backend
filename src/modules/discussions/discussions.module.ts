import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscussionsService } from './discussions.service';
import { DiscussionsController } from './discussions.controller';
import { LessonDiscussion } from '../../database/entities/lesson-discussion.entity';
import { Enrollment } from '../../database/entities/enrollment.entity';
import { User } from '../../database/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LessonDiscussion, Enrollment, User])],
  controllers: [DiscussionsController],
  providers: [DiscussionsService],
  exports: [DiscussionsService],
})
export class DiscussionsModule {}
