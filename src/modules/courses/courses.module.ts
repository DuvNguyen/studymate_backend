import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from '../../database/entities/course.entity';
import { Category } from '../../database/entities/category.entity';
import { Video } from '../../database/entities/video.entity';
import { Section } from '../../database/entities/section.entity';
import { Lesson } from '../../database/entities/lesson.entity';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';

@Module({
  imports: [TypeOrmModule.forFeature([Course, Category, Video, Section, Lesson])],
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
