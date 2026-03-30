import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Họ không được quá 50 ký tự' })
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Tên không được quá 50 ký tự' })
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Bio không được quá 500 ký tự' })
  bio?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
