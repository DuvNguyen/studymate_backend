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
}
