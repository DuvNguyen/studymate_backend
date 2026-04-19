import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { CoursesService } from './src/modules/courses/courses.service';

async function dumpCourse() {
  const app = await NestFactory.createApplicationContext(AppModule);
  // @ts-ignore - access private method for testing
  const service = app.get(CoursesService);
  const repo = (service as any).coursesRepository;
  
  const course = await repo.findOne({
    where: { slug: 'master-linux-ubuntu' },
    relations: ['sections', 'sections.lessons', 'sections.lessons.video']
  });
  
  // @ts-ignore
  const dto = service.toDto(course, true);
  console.log('COURSE JSON WITH VIDEOS:', JSON.stringify(dto, null, 2));

  await app.close();
}

dumpCourse();
