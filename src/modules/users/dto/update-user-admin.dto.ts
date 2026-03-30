import { IsOptional, IsNumber, IsEnum } from 'class-validator';
import { UserStatus } from '../../../database/entities/user.entity';

export class UpdateUserStatusDto {
  @IsEnum(UserStatus, { message: 'Trạng thái không hợp lệ' })
  status: UserStatus;
}

export class UpdateUserRoleDto {
  @IsNumber({}, { message: 'roleId phải là số' })
  roleId: number;
}
