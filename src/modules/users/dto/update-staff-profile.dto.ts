import { IsString, IsOptional, IsEnum } from 'class-validator';
import { StaffDepartment } from '../../../database/entities/staff-profile.entity';

export class UpdateStaffProfileDto {
  @IsString({ message: 'Họ tên phải là chuỗi' })
  @IsOptional()
  fullName?: string;

  @IsString({ message: 'Số điện thoại phải là chuỗi' })
  @IsOptional()
  phoneNumber?: string;

  @IsEnum(StaffDepartment, { message: 'Phòng ban không hợp lệ' })
  @IsOptional()
  department?: StaffDepartment;
}
