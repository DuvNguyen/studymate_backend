import { DataSource } from 'typeorm';
import { Course } from '../entities/course.entity';
import { Order, OrderStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Wallet } from '../entities/wallet.entity';
import { Transaction } from '../entities/transaction.entity';
import { Enrollment } from '../entities/enrollment.entity';

export async function seedTransactions(dataSource: DataSource) {
  const courseRepo = dataSource.getRepository(Course);
  const orderRepo = dataSource.getRepository(Order);
  const orderItemRepo = dataSource.getRepository(OrderItem);
  const walletRepo = dataSource.getRepository(Wallet);
  const transactionRepo = dataSource.getRepository(Transaction);
  const enrollmentRepo = dataSource.getRepository(Enrollment);

  // 1. Tìm khóa học Master Linux
  const course = await courseRepo.findOne({ where: { slug: 'master-linux-ubuntu' } });
  if (!course) {
    console.log('Không tìm thấy khóa học Master Linux, bỏ qua seed transaction.');
    return;
  }

  const instructorId = course.instructorId; // 62
  const studentId = 65; // Học viên mẫu theo yêu cầu

  console.log(`Bắt đầu seed giao dịch cho Course ID ${course.id} (Instructor ${instructorId}, Student ${studentId})`);

  // Xóa dữ liệu cũ nếu cần (Optional, but good for clean seed)
  // await transactionRepo.delete({});
  // await orderItemRepo.delete({});
  // await orderRepo.delete({});

  // 2. Đảm bảo ví tồn tại
  let instructorWallet = await walletRepo.findOne({ where: { user_id: instructorId } });
  if (!instructorWallet) {
    instructorWallet = await walletRepo.save(walletRepo.create({
      user_id: instructorId,
      balance_pending: 0,
      balance_available: 0,
      total_earned: 0,
    }));
  }

  let systemWallet = await walletRepo.findOne({ where: { user_id: 1 } });
  if (!systemWallet) {
    systemWallet = await walletRepo.save(walletRepo.create({
      user_id: 1,
      balance_pending: 0,
      balance_available: 0,
      total_earned: 0,
    }));
  }

  let studentWallet = await walletRepo.findOne({ where: { user_id: studentId } });
  if (!studentWallet) {
    studentWallet = await walletRepo.save(walletRepo.create({
      user_id: studentId,
      balance_pending: 0,
      balance_available: 0,
      total_earned: 0,
    }));
  }

  // 3. Tạo Đơn hàng (Order)
  const orderNumber = `ORD-SEED-${Date.now()}`;
  const order = await orderRepo.save(orderRepo.create({
    order_number: orderNumber,
    student_id: studentId,
    subtotal: course.price,
    discount_amount: 0,
    total_amount: course.price,
    status: OrderStatus.COMPLETED,
    completed_at: new Date(),
  }));

  // 4. Tạo Order Item
  const commissionRate = 0.3;
  const platformFee = Number(course.price) * commissionRate;
  const instructorAmount = Number(course.price) - platformFee;

  const orderItem = await orderItemRepo.save(orderItemRepo.create({
    order_id: order.id,
    course_id: course.id,
    instructor_id: instructorId,
    course_price: course.price,
    discount_amount: 0,
    final_price: course.price,
    commission_rate: commissionRate,
    platform_fee: platformFee,
    instructor_amount: instructorAmount,
  }));

  // 5. Tạo các Giao dịch (Transactions)
  
  // A. Instructor Earning (LOCKED)
  instructorWallet.balance_pending = Number(instructorWallet.balance_pending) + instructorAmount;
  instructorWallet.total_earned = Number(instructorWallet.total_earned) + instructorAmount;
  await walletRepo.save(instructorWallet);

  const lockedUntil = new Date();
  lockedUntil.setDate(lockedUntil.getDate() + 30);

  await transactionRepo.save(transactionRepo.create({
    wallet_id: instructorWallet.id,
    order_item_id: orderItem.id,
    transaction_type: 'EARNING',
    amount: instructorAmount,
    status: 'LOCKED',
    balance_after: Number(instructorWallet.balance_available) + Number(instructorWallet.balance_pending),
    locked_until: lockedUntil,
  }));

  // B. Platform Fee
  systemWallet.balance_available = Number(systemWallet.balance_available) + platformFee;
  await walletRepo.save(systemWallet);

  await transactionRepo.save(transactionRepo.create({
    wallet_id: systemWallet.id,
    order_item_id: orderItem.id,
    transaction_type: 'PLATFORM_FEE',
    amount: platformFee,
    status: 'COMPLETED',
    balance_after: Number(systemWallet.balance_available) + Number(systemWallet.balance_pending),
  }));

  // C. Student Purchase
  await transactionRepo.save(transactionRepo.create({
    wallet_id: studentWallet.id,
    order_item_id: orderItem.id,
    transaction_type: 'PURCHASE',
    amount: Number(course.price),
    status: 'COMPLETED',
    balance_after: 0,
  }));

  // 4. Seed thêm dữ liệu mẫu để test phân trang (20 records)
  console.log('Seed thêm 20 giao dịch mẫu để test phân trang...');
  
  // Lấy lại số dư hiện tại để tính toán tiếp
  let currentSystemBalance = Number(systemWallet.balance_available) + Number(systemWallet.balance_pending);
  let currentInstructorBalance = Number(instructorWallet.balance_available) + Number(instructorWallet.balance_pending);
  let currentStudentBalance = Number(studentWallet.balance_available) + Number(studentWallet.balance_pending);

  for (let i = 1; i <= 20; i++) {
    const amount = 50000 + Math.floor(Math.random() * 500000);
    const type = i % 3 === 0 ? 'EARNING' : (i % 3 === 1 ? 'PLATFORM_FEE' : 'PURCHASE');
    const status = i % 5 === 0 ? 'LOCKED' : 'COMPLETED';
    
    let targetWalletId: number;
    let balanceAfter: number;

    if (type === 'EARNING') {
      targetWalletId = instructorWallet.id;
      currentInstructorBalance += amount;
      balanceAfter = currentInstructorBalance;
    } else if (type === 'PURCHASE') {
      targetWalletId = systemWallet.id;
      currentSystemBalance += amount;
      balanceAfter = currentSystemBalance;
    } else { // PLATFORM_FEE
      targetWalletId = systemWallet.id;
      currentSystemBalance += amount;
      balanceAfter = currentSystemBalance;
    }

    const tx = transactionRepo.create({
      wallet_id: targetWalletId,
      transaction_type: type,
      amount: amount,
      status: status,
      balance_after: balanceAfter,
      order_item_id: orderItem.id,
      created_at: new Date(Date.now() - i * 3600000), // Cách nhau 1 tiếng
    });
    
    await transactionRepo.save(tx);
  }

  // Cập nhật lại số dư ví cuối cùng
  instructorWallet.balance_available = currentInstructorBalance;
  systemWallet.balance_available = currentSystemBalance;
  await walletRepo.save([instructorWallet, systemWallet]);

  console.log('\nSeed giao dịch thành công cho Admin Ledger.');
}
