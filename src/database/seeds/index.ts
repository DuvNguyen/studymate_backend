import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { Category } from '../entities/category.entity';
import { Profile } from '../entities/profile.entity';
import { InstructorProfile } from '../entities/instructor-profile.entity';
import { InstructorDocument } from '../entities/instructor-document.entity';
import { StaffProfile } from '../entities/staff-profile.entity';
import { seedRoles } from './01-roles.seed';
import { seedUsers } from './02-users.seed';
import { seedCategories } from './03-categories.seed';
import { seedSampleCourse } from './04-courses.seed';
import { Course } from '../entities/course.entity';
import { Section } from '../entities/section.entity';
import { Lesson } from '../entities/lesson.entity';
import { Video } from '../entities/video.entity';
import { QuestionBank } from '../entities/question-bank.entity';
import { QuestionBankQuestion } from '../entities/question-bank-question.entity';
import { QuestionBankOption } from '../entities/question-bank-option.entity';
import { Exam } from '../entities/exam.entity';
import { ExamSectionConfig } from '../entities/exam-section-config.entity';
import { seedSectionsAndLessons } from './05-sections-lessons.seed';
import { seedQuestionBanks } from './09-question-banks.seed';
import { seedBulkCourses } from './10-bulk-courses.seed';

// Khởi tạo kết nối DB trực tiếp — không qua NestJS
const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  entities: [User, Role, Category, Profile, InstructorProfile, InstructorDocument, StaffProfile, Course, Section, Lesson, Video, QuestionBank, QuestionBankQuestion, QuestionBankOption, Exam, ExamSectionConfig],
  synchronize: true, // tự tạo bảng nếu chưa có (chỉ dùng khi seed)
});

async function runSeeds() {
  console.log('Bắt đầu khởi tạo dữ liệu mẫu...');
  console.log('─────────────────────────────────');

  await dataSource.initialize();
  console.log('Kết nối database thành công\n');

  console.log('1. Khởi tạo vai trò người dùng...');
  await seedRoles(dataSource);

  console.log('\n2. Khởi tạo người dùng mẫu...');
  await seedUsers(dataSource);

  console.log('\n3. Khởi tạo danh mục khóa học...');
  await seedCategories(dataSource);

  console.log('\n4. Khởi tạo khóa học mẫu...');
  await seedSampleCourse(dataSource);

  console.log('\n4.5 Khởi tạo Sections & Lessons...');
  await seedSectionsAndLessons(dataSource);

  console.log('\n5. Khởi tạo ngân hàng câu hỏi & bài thi mẫu...');
  await seedQuestionBanks(dataSource);

  console.log('\n6. Khởi tạo hàng loạt khóa học mẫu...');
  await seedBulkCourses(dataSource);

  await dataSource.destroy();

  console.log('\n─────────────────────────────────');
  console.log('Hoàn thành! Dữ liệu mẫu đã được tạo.');
  console.log('  Vai trò:      5 (STUDENT, INSTRUCTOR, STAFF, ADMIN, USER)');
  console.log('  Người dùng:   6 (1 admin, 1 staff, 2 giảng viên, 2 học viên)');
  console.log('  Danh mục:     10 root + sub-categories');
}

runSeeds().catch((err) => {
  console.error('Lỗi khi chạy seed:', err);
  process.exit(1);
});