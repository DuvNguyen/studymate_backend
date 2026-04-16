import { DataSource } from 'typeorm';
import { Course } from './src/database/entities/course.entity';
import { Section } from './src/database/entities/section.entity';
import { Lesson } from './src/database/entities/lesson.entity';
import * as dotenv from 'dotenv';
dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  entities: [__dirname + '/src/database/entities/*.entity{.ts,.js}'],
});

AppDataSource.initialize().then(async () => {
  const sectionRepo = AppDataSource.getRepository(Section);
  const lessonRepo = AppDataSource.getRepository(Lesson);
  const courseRepo = AppDataSource.getRepository(Course);

  const sections = await sectionRepo.find({ where: { courseId: 1 }, order: { id: 'ASC' } });
  
  if (sections.length > 2) {
     const toDel = sections.slice(2);
     for(let s of toDel) {
       await lessonRepo.delete({ sectionId: s.id });
       await sectionRepo.delete(s.id);
     }
     console.log(`Deleted ${toDel.length} extra sections and their lessons.`);
  } else {
     console.log('No extra sections found for Course 1');
  }

  const course = await courseRepo.findOne({ where: { id: 1 } });
  if (course) {
     course.sectionCount = 2;
     course.lessonCount = 4;
     await courseRepo.save(course);
     console.log('Fixed Course 1 section & lesson count cache.');
  }

  process.exit(0);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
