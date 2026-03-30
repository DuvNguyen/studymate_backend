import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from '../../database/entities/user.entity';
import { Role } from '../../database/entities/role.entity';
import { AuthModule } from '../auth/auth.module';
import { Profile } from '../../database/entities/profile.entity';
import { InstructorProfile } from '../../database/entities/instructor-profile.entity';
import { StaffProfile } from '../../database/entities/staff-profile.entity';
import { InstructorDocument } from '../../database/entities/instructor-document.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Role,
      Profile,
      InstructorProfile,
      StaffProfile,
      InstructorDocument,
    ]),
    AuthModule, // tái dùng ClerkAuthGuard
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
