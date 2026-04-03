import { IsOptional, IsNumber, IsEnum, IsString } from 'class-validator';
import { UserStatus } from '../../../database/entities/user.entity';

export class UpdateUserStatusDto {
  @IsEnum(UserStatus, { message: 'Trạng thái không hợp lệ' })
  status: UserStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateUserRoleDto {
  @IsNumber({}, { message: 'roleId phải là số' })
  roleId: number;
}
