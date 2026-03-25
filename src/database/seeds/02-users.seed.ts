import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';

export async function seedUsers(dataSource: DataSource) {
  const userRepo = dataSource.getRepository(User);
  const roleRepo = dataSource.getRepository(Role);

  const roleAdmin = await roleRepo.findOne({ where: { roleName: 'ADMIN' } });
  const roleStaff = await roleRepo.findOne({ where: { roleName: 'STAFF' } });
  const roleInstructor = await roleRepo.findOne({ where: { roleName: 'INSTRUCTOR' } });
  const roleStudent = await roleRepo.findOne({ where: { roleName: 'STUDENT' } });

  if (!roleAdmin || !roleStaff || !roleInstructor || !roleStudent) {
    throw new Error('Roles chưa được tạo. Hãy chạy seedRoles trước.');
  }

  const seedData = [
    {
      clerkUserId: 'seed_admin_001',
      email: 'admin@studymate.vn',
      roleId: roleAdmin.id,
    },
    {
      clerkUserId: 'seed_staff_001',
      email: 'staff.kyc@studymate.vn',
      roleId: roleStaff.id,
    },
    {
      clerkUserId: 'seed_instructor_001',
      email: 'nguyen.van.an@studymate.vn',
      roleId: roleInstructor.id,
    },
    {
      clerkUserId: 'seed_instructor_002',
      email: 'tran.thi.bich@studymate.vn',
      roleId: roleInstructor.id,
    },
    {
      clerkUserId: 'seed_student_001',
      email: 'le.minh.duc@gmail.com',
      roleId: roleStudent.id,
    },
    {
      clerkUserId: 'seed_student_002',
      email: 'pham.thu.huong@gmail.com',
      roleId: roleStudent.id,
    },
  ];

  for (const data of seedData) {
    const existing = await userRepo.findOne({ where: { clerkUserId: data.clerkUserId } });
    if (!existing) {
      await userRepo.save(data);
      console.log(`  Tạo user: ${data.email}`);
    } else {
      console.log(`  User đã tồn tại: ${data.email}`);
    }
  }
}