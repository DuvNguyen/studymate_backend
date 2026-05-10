import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { Category } from '../entities/category.entity';
import { Course } from '../entities/course.entity';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Transaction } from '../entities/transaction.entity';
import { RevenueAnalyticsSeed } from './12-revenue-analytics.seed';

import { Cart } from '../entities/cart.entity';
import { CartItem } from '../entities/cart-item.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { Wallet } from '../entities/wallet.entity';
import { Payout } from '../entities/payout.entity';
import { Review } from '../entities/review.entity';
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
import { Quiz } from '../entities/quiz.entity';
import { QuizAttempt } from '../entities/quiz-attempt.entity';
import { Exam } from '../entities/exam.entity';
import { ExamSectionConfig } from '../entities/exam-section-config.entity';
import { Wishlist } from '../entities/wishlist.entity';

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  entities: [
    User, Role, Category, Course, Order, OrderItem, Transaction,
    Cart, CartItem, Enrollment, Wallet, Payout, Review, Profile,
    InstructorProfile, InstructorDocument, StaffProfile, Section,
    Lesson, Video, QuestionBank, QuestionBankQuestion, QuestionBankOption,
    Quiz, QuizAttempt, Exam, ExamSectionConfig, Wishlist
  ],
  synchronize: false,
});

async function run() {
  await dataSource.initialize();
  const seeder = new RevenueAnalyticsSeed();
  await seeder.run(dataSource);
  await dataSource.destroy();
}

run().catch(console.error);
