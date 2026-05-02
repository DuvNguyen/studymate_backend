import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscussionsService } from './discussions.service';
import { DiscussionsController } from './discussions.controller';
import { LessonDiscussion } from '../../database/entities/lesson-discussion.entity';
import { DiscussionVote } from '../../database/entities/discussion-vote.entity';
import { Enrollment } from '../../database/entities/enrollment.entity';
import { User } from '../../database/entities/user.entity';
import { Course } from '../../database/entities/course.entity';
import { Lesson } from '../../database/entities/lesson.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LessonDiscussion, DiscussionVote, Enrollment, User, Course, Lesson])],
  controllers: [DiscussionsController],
  providers: [DiscussionsService],
  exports: [DiscussionsService],
})
export class DiscussionsModule {}
