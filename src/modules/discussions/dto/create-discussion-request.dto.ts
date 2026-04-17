import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateDiscussionDto {
  @IsNotEmpty()
  @IsNumber()
  courseId: number;

  @IsNotEmpty()
  @IsNumber()
  lessonId: number;

  @IsNotEmpty()
  @IsString()
  content: string;

  @IsOptional()
  @IsNumber()
  parentId?: number;
}
