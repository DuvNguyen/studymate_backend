import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Course } from '../entities/course.entity';
import { Category } from '../entities/category.entity';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { Profile } from '../entities/profile.entity';
import { InstructorProfile } from '../entities/instructor-profile.entity';
import { InstructorDocument } from '../entities/instructor-document.entity';
import { StaffProfile } from '../entities/staff-profile.entity';
import { Section } from '../entities/section.entity';
import { Lesson } from '../entities/lesson.entity';
import { Video } from '../entities/video.entity';
import { QuestionBank } from '../entities/question-bank.entity';
import { QuestionBankQuestion } from '../entities/question-bank-question.entity';
import { QuestionBankOption } from '../entities/question-bank-option.entity';
import { Exam } from '../entities/exam.entity';
import { ExamSectionConfig } from '../entities/exam-section-config.entity';

async function updateTestPrice() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    entities: [User, Role, Category, Profile, InstructorProfile, InstructorDocument, StaffProfile, Course, Section, Lesson, Video, QuestionBank, QuestionBankQuestion, QuestionBankOption, Exam, ExamSectionConfig],
  });

  await dataSource.initialize();
  console.log('Connected to DB');

  const courseRepo = dataSource.getRepository(Course);
  
  // Update the first course found or a specific one
  const course = await courseRepo.findOne({ where: { slug: 'financial-accounting' } });
  
  if (course) {
    course.price = 10000;
    course.title = 'TEST COURSE';
    await courseRepo.save(course);
    console.log(`Updated course "${course.title}" price to 10,000 VND`);
  } else {
    console.log('Course not found');
  }

  await dataSource.destroy();
}

updateTestPrice().catch(console.error);
