import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { CategoriesService } from './categories.service';
import { CategoryResponseDto } from './dto/category-response.dto';

@Controller('categories')
@UseInterceptors(CacheInterceptor)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /**
   * GET /api/v1/categories
   * Public — trả danh sách root categories kèm children.
   */
  @Get()
  @CacheKey('categories_tree')
  @CacheTTL(86400 * 1000) // 24 hours in ms
  async getTree(): Promise<CategoryResponseDto[]> {
    return this.categoriesService.getTree();
  }

  /**
   * GET /api/v1/categories/:slug
   * Public — lấy category cụ thể theo slug, kèm children.
   */
  @Get(':slug')
  async findBySlug(@Param('slug') slug: string): Promise<CategoryResponseDto> {
    return this.categoriesService.findBySlug(slug);
  }
}
