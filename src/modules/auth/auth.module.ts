import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from '../../database/entities/user.entity';
import { Role } from '../../database/entities/role.entity';
import { InstructorProfile } from '../../database/entities/instructor-profile.entity';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, InstructorProfile])],
  controllers: [AuthController],
  providers: [AuthService, ClerkAuthGuard],
  exports: [AuthService, ClerkAuthGuard], // export để module khác dùng
})
export class AuthModule {}
