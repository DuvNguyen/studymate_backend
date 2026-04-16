import { IsInt, IsNotEmpty } from 'class-validator';

export class AddToCartDto {
  @IsInt()
  @IsNotEmpty()
  courseId: number;
}
