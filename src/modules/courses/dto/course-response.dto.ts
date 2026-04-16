import { Expose, Type } from 'class-transformer';

export class LessonDto {
  @Expose()
  id: number;

  @Expose()
  title: string;

  @Expose()
  durationSecs: number;

  @Expose()
  isPreview: boolean;

  @Expose()
  youtubeVideoId: string | null;

  @Expose()
  position: number;
}

export class SectionDto {
  @Expose()
  id: number;

  @Expose()
  title: string;

  @Expose()
  position: number;

  @Expose()
  @Type(() => LessonDto)
  lessons: LessonDto[];
}

export class CourseInstructorDto {
  @Expose()
  id: number;

  @Expose()
  fullName: string | null;

  @Expose()
  avatarUrl: string | null;
}

export class CourseCategoryDto {
  @Expose()
  id: number;

  @Expose()
  name: string;

  @Expose()
  slug: string;
}

export class CourseResponseDto {
  @Expose()
  id: number;

  @Expose()
  title: string;

  @Expose()
  slug: string;

  @Expose()
  description: string | null;

  @Expose()
  thumbnailUrl: string | null;

  @Expose()
  price: number;

  @Expose()
  originalPrice: number | null;

  @Expose()
  language: string;

  @Expose()
  level: string;

  @Expose()
  status: string;

  @Expose()
  totalDuration: number;

  @Expose()
  lessonCount: number;

  @Expose()
  sectionCount: number;

  @Expose()
  studentCount: number;

  @Expose()
  avgRating: number;

  @Expose()
  reviewCount: number;

  @Expose()
  publishedAt: Date | null;

  @Expose()
  createdAt: Date;

  @Expose()
  @Type(() => CourseInstructorDto)
  instructor: CourseInstructorDto;

  @Expose()
  @Type(() => CourseCategoryDto)
  category: CourseCategoryDto;

  @Expose()
  @Type(() => SectionDto)
  sections: SectionDto[];

  @Expose()
  previewVideo: any;
}

export class PaginationMetaDto {
  @Expose()
  total: number;

  @Expose()
  page: number;

  @Expose()
  limit: number;

  @Expose()
  totalPages: number;
}

export class PaginatedCoursesDto {
  @Expose()
  @Type(() => CourseResponseDto)
  data: CourseResponseDto[];

  @Expose()
  @Type(() => PaginationMetaDto)
  meta: PaginationMetaDto;
}
