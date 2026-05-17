import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    example: 'Nguyen',
    maxLength: 50,
    description: 'Họ của người dùng',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Họ không được quá 50 ký tự' })
  firstName?: string;

  @ApiPropertyOptional({
    example: 'An',
    maxLength: 50,
    description: 'Tên của người dùng',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Tên không được quá 50 ký tự' })
  lastName?: string;

  @ApiPropertyOptional({
    example: 'Backend engineer and mentor',
    maxLength: 500,
    description: 'Tiểu sử ngắn hiển thị trên hồ sơ',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Bio không được quá 500 ký tự' })
  bio?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/avatar.jpg',
    description: 'URL ảnh đại diện',
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
