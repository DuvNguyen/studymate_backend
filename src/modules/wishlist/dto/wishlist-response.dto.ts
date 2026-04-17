import { Expose, Type } from 'class-transformer';
import { CourseResponseDto } from '../../courses/dto/course-response.dto';

export class WishlistResponseDto {
  @Expose()
  id: number;

  @Expose()
  courseId: number;

  @Expose()
  @Type(() => CourseResponseDto)
  course: CourseResponseDto;

  @Expose()
  addedAt: Date;
}

export class WishlistCheckResponseDto {
  @Expose()
  isInWishlist: boolean;
}
