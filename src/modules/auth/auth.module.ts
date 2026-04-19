import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from '../../database/entities/user.entity';
import { Role } from '../../database/entities/role.entity';
import { InstructorProfile } from '../../database/entities/instructor-profile.entity';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([User, Role, InstructorProfile])],
  controllers: [AuthController],
  providers: [AuthService, ClerkAuthGuard, RolesGuard],
  exports: [AuthService, ClerkAuthGuard, RolesGuard], // export để module khác dùng
})
export class AuthModule {}
