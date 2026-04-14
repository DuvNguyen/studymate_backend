import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateCourseDto {
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  @IsString()
  title: string;

  @IsNotEmpty({ message: 'Danh mục không được để trống' })
  @IsNumber({}, { message: 'ID Danh mục phải là số' })
  categoryId: number;
}
