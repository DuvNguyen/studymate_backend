import { Expose, Type } from 'class-transformer';

export class CourseShortResponseDto {
  @Expose()
  id: number;

  @Expose()
  title: string;

  @Expose({ name: 'thumbnailUrl' })
  thumbnail: string;

  @Expose()
  instructor_name: string;

  @Expose()
  slug: string;
}
export class OrderItemShortDto {
  @Expose()
  final_price: number;
}

export class RefundRequestShortDto {
  @Expose()
  id: number;

  @Expose()
  status: string;

  @Expose()
  reason: string;

  @Expose()
  created_at: Date;
}

export class EnrollmentResponseDto {
  @Expose()
  id: number;

  @Expose()
  course_id: number;

  @Expose()
  @Type(() => CourseShortResponseDto)
  course: CourseShortResponseDto;

  @Expose()
  progress_percent: number;

  @Expose()
  enrolled_at: Date;

  @Expose()
  last_accessed_at: Date;

  @Expose()
  completed_at: Date;

  @Expose()
  is_active: boolean;

  @Expose()
  @Type(() => OrderItemShortDto)
  order_item: OrderItemShortDto;

  @Expose()
  @Type(() => RefundRequestShortDto)
  refund_request: RefundRequestShortDto;
}
