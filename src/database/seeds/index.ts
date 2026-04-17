import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { Category } from '../entities/category.entity';
import { Profile } from '../entities/profile.entity';
import { InstructorProfile } from '../entities/instructor-profile.entity';
import { InstructorDocument } from '../entities/instructor-document.entity';
import { StaffProfile } from '../entities/staff-profile.entity';
import { Course } from '../entities/course.entity';
import { Section } from '../entities/section.entity';
import { Lesson } from '../entities/lesson.entity';
import { Video } from '../entities/video.entity';
import { QuestionBank } from '../entities/question-bank.entity';
import { QuestionBankQuestion } from '../entities/question-bank-question.entity';
import { QuestionBankOption } from '../entities/question-bank-option.entity';
import { Exam } from '../entities/exam.entity';
import { ExamSectionConfig } from '../entities/exam-section-config.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Cart } from '../entities/cart.entity';
import { CartItem } from '../entities/cart-item.entity';
import { Wallet } from '../entities/wallet.entity';
import { Transaction } from '../entities/transaction.entity';
import { LessonProgress } from '../entities/lesson-progress.entity';
import { LessonDiscussion } from '../entities/lesson-discussion.entity';
import { Wishlist } from '../entities/wishlist.entity';

import { seedRoles } from './01-roles.seed';
import { seedUsers } from './02-users.seed';
import { seedCategories } from './03-categories.seed';
import { seedMasterCourse } from './11-master-course.seed';

// Khởi tạo kết nối DB trực tiếp — không qua NestJS
const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  entities: [
    User,
    Role,
    Category,
    Profile,
    InstructorProfile,
    InstructorDocument,
    StaffProfile,
    Course,
    Section,
    Lesson,
    Video,
    QuestionBank,
    QuestionBankQuestion,
    QuestionBankOption,
    Exam,
    ExamSectionConfig,
    Enrollment,
    Order,
    OrderItem,
    Cart,
    CartItem,
    Wallet,
    Transaction,
    LessonProgress,
    LessonDiscussion,
    Wishlist,
  ],
  synchronize: false, // Tắt synchronize để tránh lỗi drop/alter table
});

async function runSeeds() {
  console.log('Bắt đầu khởi tạo dữ liệu mẫu (MASTER ONLY)...');
  console.log('─────────────────────────────────');

  await dataSource.initialize();
  console.log('Kết nối database thành công\n');

  console.log('1. Đảm bảo vai trò & danh mục đã tồn tại...');
  await seedRoles(dataSource);
  await seedCategories(dataSource);
  // await seedUsers(dataSource); // Có thể bỏ qua nếu user đã có

  console.log('\n2. Khởi tạo KHÓA HỌC MASTER (Linux Ubuntu)...');
  await seedMasterCourse(dataSource);

  await dataSource.destroy();

  console.log('\n─────────────────────────────────');
  console.log('Hoàn thành! Khóa học Master đã được tạo.');
}

runSeeds().catch((err) => {
  console.error('Lỗi khi chạy seed:', err);
  process.exit(1);
});
