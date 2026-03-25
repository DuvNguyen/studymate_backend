import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { seedRoles } from './01-roles.seed';
import { seedUsers } from './02-users.seed';

// Khởi tạo kết nối DB trực tiếp — không qua NestJS
const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  entities: [User, Role],
  synchronize: false, // không sync ở đây, đã có NestJS lo
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

  await dataSource.destroy();

  console.log('\n─────────────────────────────────');
  console.log('Hoàn thành! Dữ liệu mẫu đã được tạo.');
  console.log('  Vai trò:      4 (STUDENT, INSTRUCTOR, STAFF, ADMIN)');
  console.log('  Người dùng:   6 (1 admin, 1 staff, 2 giảng viên, 2 học viên)');
}

runSeeds().catch((err) => {
  console.error('Lỗi khi chạy seed:', err);
  process.exit(1);
});