import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LessonProgressService } from './lesson-progress.service';
import { LessonProgressController } from './lesson-progress.controller';
import { LessonProgress } from '../../database/entities/lesson-progress.entity';
import { Enrollment } from '../../database/entities/enrollment.entity';
import { Lesson } from '../../database/entities/lesson.entity';
import { User } from '../../database/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LessonProgress, Enrollment, Lesson, User])],
  controllers: [LessonProgressController],
  providers: [LessonProgressService],
  exports: [LessonProgressService],
})
export class LessonProgressModule {}
