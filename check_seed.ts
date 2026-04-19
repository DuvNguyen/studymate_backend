import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DataSource } from 'typeorm';
import { Video } from './src/database/entities/video.entity';
import { Lesson } from './src/database/entities/lesson.entity';

async function checkSeed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  
  const videos = await dataSource.getRepository(Video).find();
  console.log('VIDEOS IN DB:', videos.length);
  videos.forEach((v: any) => console.log(`ID: ${v.id}, Title: ${v.title}, Status: ${v.status}, YT: ${v.youtubeVideoId}`));

  const lessonsCount = await dataSource.getRepository(Lesson).count();
  console.log('LESSONS IN DB:', lessonsCount);

  await app.close();
}

checkSeed();
