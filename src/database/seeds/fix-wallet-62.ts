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
  const userId = 62;
  console.log(`[Script] Bắt đầu sửa ví cho giảng viên ID ${userId}...`);

  await dataSource.initialize();
  console.log('[Script] Đã kết nối Database.');

  const walletRepo = dataSource.getRepository(Wallet);
  const transactionRepo = dataSource.getRepository(Transaction);

  const wallet = await walletRepo.findOne({ where: { user_id: userId } });
  if (!wallet) {
    console.log(`[Script] Không tìm thấy ví cho user ${userId}.`);
    await dataSource.destroy();
    return;
  }

  console.log(`[Script] Trạng thái ví hiện tại:`);
  console.log(
    ` - Số dư đóng băng (balance_pending): ${wallet.balance_pending}`,
  );
  console.log(
    ` - Số dư khả dụng (balance_available): ${wallet.balance_available}`,
  );
  console.log(` - Thu nhập tích lũy (total_earned): ${wallet.total_earned}`);

  const transactions = await transactionRepo.find({
    where: { wallet_id: wallet.id },
    order: { created_at: 'ASC' },
  });

  console.log(`[Script] Tìm thấy ${transactions.length} giao dịch.`);

  let calculatedPending = 0;
  let calculatedAvailable = 0;
  let calculatedWithdrawalsCompleted = 0;

  for (const tx of transactions) {
    const amount = Number(tx.amount);
    console.log(
      ` - Giao dịch ID: ${tx.id} | Loại: ${tx.transaction_type} | Số tiền: ${amount} | Trạng thái: ${tx.status}`,
    );

    if (tx.transaction_type === 'EARNING') {
      if (tx.status === 'LOCKED') {
        calculatedPending += amount;
      } else if (tx.status === 'AVAILABLE' || tx.status === 'COMPLETED') {
        calculatedAvailable += amount;
      }
    } else if (tx.transaction_type === 'REFUND') {
      if (tx.status !== 'CANCELLED') {
        calculatedAvailable += amount;
      }
    } else if (tx.transaction_type === 'WITHDRAWAL') {
      if (tx.status !== 'CANCELLED') {
        calculatedAvailable += amount; // rút tiền mang giá trị âm nên cộng vào sẽ tự động giảm khả dụng
        if (tx.status === 'AVAILABLE' || tx.status === 'COMPLETED') {
          calculatedWithdrawalsCompleted += Math.abs(amount);
        }
      }
    }
  }

  // Thu nhập tích lũy = Số dư đóng băng + Số dư khả dụng + Tiền đã rút thành công
  const totalEarned =
    calculatedPending + calculatedAvailable + calculatedWithdrawalsCompleted;

  console.log(`[Script] Kết quả tính toán mới:`);
  console.log(` - Số dư đóng băng mới: ${calculatedPending}`);
  console.log(` - Số dư khả dụng mới: ${calculatedAvailable}`);
  console.log(` - Thu nhập tích lũy mới: ${totalEarned}`);

  wallet.balance_pending = calculatedPending;
  wallet.balance_available = calculatedAvailable;
  wallet.total_earned = totalEarned;

  await walletRepo.save(wallet);
  console.log('[Script] Đã cập nhật ví thành công vào Database!');

  await dataSource.destroy();
}

run().catch((err) => {
  console.error('[Script] Lỗi khi chạy script:', err);
  process.exit(1);
});
