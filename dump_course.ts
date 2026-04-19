import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { CoursesService } from './src/modules/courses/courses.service';

async function dumpCourse() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(CoursesService);
  
  const course = await service.findBySlug('master-linux-ubuntu');
  console.log('COURSE JSON:', JSON.stringify(course, null, 2));

  await app.close();
}

dumpCourse();
