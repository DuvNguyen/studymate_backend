import { Expose, Type } from 'class-transformer';

export class CartCourseDto {
  @Expose()
  id: number;

  @Expose()
  title: string;

  @Expose()
  thumbnailUrl: string;

  @Expose()
  price: number;
}

export class CartItemResponseDto {
  @Expose()
  id: number;

  @Expose()
  cart_id: number;

  @Expose()
  course_id: number;

  @Expose()
  @Type(() => CartCourseDto)
  course: CartCourseDto;

  @Expose()
  original_price: number;

  @Expose()
  discount_amount: number;

  @Expose()
  final_price: number;
}

export class CartResponseDto {
  @Expose()
  id: number;

  @Expose()
  student_id: number;

  @Expose()
  @Type(() => CartItemResponseDto)
  cart_items: CartItemResponseDto[];
}
