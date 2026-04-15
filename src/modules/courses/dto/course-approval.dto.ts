import { IsNotEmpty, IsString } from 'class-validator';

export class RejectCourseDto {
  @IsNotEmpty({ message: 'Lý do từ chối không được để trống' })
  @IsString({ message: 'Lý do từ chối phải là chuỗi văn bản' })
  reason: string;
}
