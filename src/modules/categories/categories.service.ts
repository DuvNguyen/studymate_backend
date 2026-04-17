import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Category } from '../../database/entities/category.entity';
import { CategoryResponseDto } from './dto/category-response.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  /**
   * Map Category entity sang DTO an toàn — tránh circular reference.
   */
  private toDto(cat: Category, includeChildren = true): CategoryResponseDto {
    const dto = new CategoryResponseDto();
    dto.id = cat.id;
    dto.name = cat.name;
    dto.slug = cat.slug;
    dto.description = cat.description ?? null;
    dto.parentId = cat.parentId ?? null;
    dto.iconUrl = cat.iconUrl ?? null;
    dto.sortOrder = cat.sortOrder;
    dto.isActive = cat.isActive;
    dto.children = includeChildren
      ? (cat.children ?? [])
          .filter((c) => c.isActive)
          .sort(
            (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
          )
          .map((c) => this.toDto(c, false)) // false — không load tiếp children của children
      : [];
    return dto;
  }

  /**
   * Trả về tất cả categories cấp 1 (root) kèm 1 level children.
   * Chỉ lấy các category đang active, sắp xếp theo sort_order.
   */
  async getTree(): Promise<CategoryResponseDto[]> {
    const roots = await this.categoriesRepository.find({
      where: { parentId: IsNull(), isActive: true },
      relations: ['children'],
      order: { sortOrder: 'ASC', name: 'ASC' },
    });

    return roots.map((cat) => this.toDto(cat, true));
  }

  /**
   * Lấy một category theo slug, kèm children của nó.
   */
  async findBySlug(slug: string): Promise<CategoryResponseDto> {
    const category = await this.categoriesRepository.findOne({
      where: { slug, isActive: true },
      relations: ['children'],
    });

    if (!category) {
      throw new NotFoundException(`Category "${slug}" không tồn tại`);
    }

    return this.toDto(category, true);
  }
}
