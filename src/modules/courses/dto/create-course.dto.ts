import { IsNotEmpty, IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { CourseLevel } from '../../../database/entities/course.entity';

export class CreateCourseDto {
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  @IsString()
  title: string;

  @IsNotEmpty({ message: 'Danh mục không được để trống' })
  @IsNumber({}, { message: 'ID Danh mục phải là số' })
  categoryId: number;

  @IsOptional()
  @IsEnum(CourseLevel, { message: 'Cấp độ không hợp lệ' })
  level?: CourseLevel;

  @IsNotEmpty({ message: 'Giá không được để trống' })
  @IsNumber({}, { message: 'Giá phải là số' })
  price: number;

  @IsOptional()
  @IsNumber({}, { message: 'Giá gốc phải là số' })
  originalPrice?: number;
}
