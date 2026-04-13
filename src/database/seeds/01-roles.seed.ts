import { DataSource } from 'typeorm';
import { Role } from '../entities/role.entity';

export async function seedRoles(dataSource: DataSource) {
  const roleRepo = dataSource.getRepository(Role);

  const roles = ['STUDENT', 'INSTRUCTOR', 'STAFF', 'ADMIN', 'USER'];

  for (const roleName of roles) {
    const existing = await roleRepo.findOne({ where: { roleName } });
    if (!existing) {
      await roleRepo.save({ roleName });
      console.log(`  Tạo role: ${roleName}`);
    } else {
      console.log(`  Role đã tồn tại: ${roleName}`);
    }
  }
}