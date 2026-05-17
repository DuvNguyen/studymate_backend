import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { StaffProfile } from '../entities/staff-profile.entity';
import { Profile } from '../entities/profile.entity';

export async function seedUsers(dataSource: DataSource) {
  const userRepo = dataSource.getRepository(User);
  const roleRepo = dataSource.getRepository(Role);

  const roleAdmin = await roleRepo.findOne({ where: { roleName: 'ADMIN' } });
  const roleStaff = await roleRepo.findOne({ where: { roleName: 'STAFF' } });
  const roleInstructor = await roleRepo.findOne({
    where: { roleName: 'INSTRUCTOR' },
  });
  const roleStudent = await roleRepo.findOne({
    where: { roleName: 'STUDENT' },
  });

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
      email: 'nguyen.thi.bich.nguyen@studymate.vn',
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
    const existing = await userRepo.findOne({
      where: { clerkUserId: data.clerkUserId },
    });
    if (!existing) {
      const newUser = await userRepo.save(data);
      console.log(`  Tạo user: ${data.email}`);

      // Tạo profile cho user mới
      if (data.email === 'admin@studymate.vn') {
        const staffRepo = dataSource.getRepository(StaffProfile);
        await staffRepo.save({
          userId: newUser.id,
          fullName: 'StudyMate Admin',
          phoneNumber: '0123456789',
        });
      } else if (data.email.includes('instructor')) {
        const profileRepo = dataSource.getRepository(Profile);
        await profileRepo.save({
          userId: newUser.id,
          fullName:
            data.email === 'nguyen.van.an@studymate.vn'
              ? 'Nguyễn Văn An'
              : 'Nguyễn Thị Bích Nguyễn',
        });
      }
    } else {
      // Đảm bảo user cũ cũng có profile
      const profileRepo = dataSource.getRepository(Profile);

      if (data.email === 'admin@studymate.vn') {
        const profile = await profileRepo.findOne({
          where: { userId: existing.id },
        });
        if (!profile) {
          const staffRepo = dataSource.getRepository(StaffProfile);
          await staffRepo.save({
            userId: existing.id,
            fullName: 'StudyMate System',
            phoneNumber: '0123456789',
          });
        }
      } else if (data.email === 'nguyen.van.an@studymate.vn') {
        const profile = await profileRepo.findOne({
          where: { userId: existing.id },
        });
        if (!profile) {
          await profileRepo.save({
            userId: existing.id,
            fullName: 'Giảng Viên Master',
          });
        }
      }

      console.log(`  User đã tồn tại: ${data.email}`);
    }
  }
}
