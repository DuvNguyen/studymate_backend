import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LessonDiscussion } from './src/database/entities/lesson-discussion.entity';
import { Repository } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const repo = app.get<Repository<LessonDiscussion>>(getRepositoryToken(LessonDiscussion));
  const count = await repo.count();
  console.log('TOTAL DISCUSSIONS:', count);
  
  const discussions = await repo.find({ relations: ['course'] });
  console.log('DISCUSSIONS WITH COURSE:');
  discussions.slice(0, 5).forEach(d => {
    console.log(`- ID: ${d.id}, CourseID: ${d.course_id}, InstructorID: ${d.course?.instructorId}`);
  });
  
  await app.close();
}

bootstrap();
