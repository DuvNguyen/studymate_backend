import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DataSource } from 'typeorm';
import { Lesson } from './src/database/entities/lesson.entity';

async function checkLinks() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  
  const lessons = await dataSource.getRepository(Lesson).find({
    where: { section: { course: { slug: 'master-linux-ubuntu' } } },
    relations: ['video']
  });
  
  console.log('LESSONS FOR MASTER COURSE:');
  lessons.forEach((l: any) => {
    console.log(`Lesson ID: ${l.id}, Title: ${l.title}, VideoID in DB: ${l.videoId}, Video Entity Linked: ${!!l.video}, YT ID: ${l.video?.youtubeVideoId}`);
  });

  await app.close();
}

checkLinks();
