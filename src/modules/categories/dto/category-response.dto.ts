import { Expose, Type } from 'class-transformer';

export class CategoryResponseDto {
  @Expose()
  id: number;

  @Expose()
  name: string;

  @Expose()
  slug: string;

  @Expose()
  description: string | null;

  @Expose()
  parentId: number | null;

  @Expose()
  iconUrl: string | null;

  @Expose()
  sortOrder: number;

  @Expose()
  isActive: boolean;

  @Expose()
  @Type(() => CategoryResponseDto)
  children: CategoryResponseDto[];
}
