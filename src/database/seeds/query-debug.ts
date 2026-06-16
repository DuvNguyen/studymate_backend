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
import { Quiz } from '../entities/quiz.entity';
import { QuizAttempt } from '../entities/quiz-attempt.entity';
import { Payout } from '../entities/payout.entity';
import { Review } from '../entities/review.entity';
import { Coupon } from '../entities/coupon.entity';
import { DiscussionVote } from '../entities/discussion-vote.entity';
import { Notification } from '../entities/notification.entity';
import { RefundRequest } from '../entities/refund-request.entity';

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
    Quiz,
    QuizAttempt,
    Payout,
    Review,
    Coupon,
    DiscussionVote,
    Notification,
    RefundRequest,
  ],
  synchronize: false,
});

async function run() {
  await dataSource.initialize();
  console.log('--- CONNECTED ---');

  const userRepo = dataSource.getRepository(User);
  const discussionRepo = dataSource.getRepository(LessonDiscussion);
  const voteRepo = dataSource.getRepository(DiscussionVote);

  const user62 = await userRepo.findOne({
    where: { id: 62 },
    relations: ['role'],
  });
  console.log('User 62:', {
    id: user62?.id,
    clerkUserId: user62?.clerkUserId,
    email: user62?.email,
    role: user62?.role,
  });

  const allDiscussions = await discussionRepo.find({
    take: 5,
    relations: ['user', 'user.role'],
  });
  console.log('Top 5 Discussions:');
  for (const d of allDiscussions) {
    console.log(`Discussion #${d.id}:`, {
      content: d.content,
      upvotes: d.upvotes,
      downvotes: d.downvotes,
      is_best_answer: d.is_best_answer,
      author: d.user?.email,
      authorRole: d.user?.role?.roleName,
    });
  }

  const votes = await voteRepo.find({ take: 5 });
  console.log('Top 5 Votes:', votes);

  await dataSource.destroy();
}

run().catch(console.error);
