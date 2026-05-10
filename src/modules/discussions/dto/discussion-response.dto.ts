import { Expose, Type } from 'class-transformer';

export class UserMiniDto {
  @Expose()
  id: number;

  @Expose()
  @Type(() => String)
  fullName: string;

  @Expose()
  avatarUrl: string;

  @Expose()
  role: { roleName: string };
}

export class CourseMiniDto {
  @Expose()
  id: number;

  @Expose()
  title: string;

  @Expose()
  slug: string;
}

export class LessonMiniDto {
  @Expose()
  id: number;

  @Expose()
  title: string;
}

export class DiscussionResponseDto {
  @Expose()
  id: number;

  @Expose()
  course_id: number;

  @Expose()
  lesson_id: number;

  @Expose()
  @Type(() => CourseMiniDto)
  course?: CourseMiniDto;

  @Expose()
  @Type(() => LessonMiniDto)
  lesson?: LessonMiniDto;

  @Expose()
  content: string;

  @Expose()
  is_best_answer: boolean;

  @Expose()
  is_deleted: boolean;

  @Expose()
  is_edited: boolean;

  @Expose()
  parent_id: number;

  @Expose()
  upvotes: number;

  @Expose()
  downvotes: number;

  @Expose()
  userVote: number;

  @Expose()
  @Type(() => UserMiniDto)
  user: UserMiniDto;

  @Expose()
  created_at: Date;

  @Expose()
  updated_at: Date;

  @Expose()
  @Type(() => DiscussionResponseDto)
  children: DiscussionResponseDto[];
}
