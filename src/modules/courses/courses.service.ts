import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course, CourseStatus } from '../../database/entities/course.entity';
import { Category } from '../../database/entities/category.entity';
import { CourseQueryDto } from './dto/course-query.dto';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import {
  CourseResponseDto,
  CourseInstructorDto,
  CourseCategoryDto,
  SectionDto,
  LessonDto,
  PaginatedCoursesDto,
  PaginationMetaDto,
} from './dto/course-response.dto';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly coursesRepository: Repository<Course>,
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  /**
   * Map Course entity sang CourseResponseDto.
   * Instructor fullName lấy từ profile.full_name (nullable).
   */
  private toDto(course: Course): CourseResponseDto {
    const dto = new CourseResponseDto();

    dto.id = course.id;
    dto.title = course.title;
    dto.slug = course.slug;
    dto.description = course.description ?? null;
    dto.thumbnailUrl = course.thumbnailUrl ?? null;
    dto.price = Number(course.price);
    dto.originalPrice = course.originalPrice ? Number(course.originalPrice) : null;
    dto.language = course.language;
    dto.level = course.level;
    dto.status = course.status;
    dto.totalDuration = course.totalDuration;
    dto.lessonCount = course.lessonCount;
    dto.sectionCount = course.sectionCount;
    dto.studentCount = course.studentCount;
    dto.avgRating = Number(course.avgRating);
    dto.reviewCount = course.reviewCount;
    dto.publishedAt = course.publishedAt ?? null;
    dto.createdAt = course.createdAt;

    const instructor = new CourseInstructorDto();
    instructor.id = course.instructor?.id;
    instructor.fullName = (course.instructor as any)?.profile?.fullName ?? null;
    instructor.avatarUrl = course.instructor?.avatarUrl ?? null;
    dto.instructor = instructor;

    const category = new CourseCategoryDto();
    category.id = course.category?.id;
    category.name = course.category?.name;
    category.slug = course.category?.slug;
    dto.category = category;

    if (course.sections) {
      dto.sections = course.sections
        .sort((a, b) => a.position - b.position)
        .map((s) => {
          const sectionDto = new SectionDto();
          sectionDto.id = s.id;
          sectionDto.title = s.title;
          sectionDto.position = s.position;
          
          if (s.lessons) {
            sectionDto.lessons = s.lessons
              .sort((a, b) => a.position - b.position)
              .map((l) => {
                const lessonDto = new LessonDto();
                lessonDto.id = l.id;
                lessonDto.title = l.title;
                lessonDto.durationSecs = l.durationSecs;
                lessonDto.isPreview = l.isPreview;
                lessonDto.position = l.position;
                lessonDto.youtubeVideoId = l.isPreview && l.video ? l.video.youtubeVideoId : null;
                return lessonDto;
              });
          } else {
            sectionDto.lessons = [];
          }
          
          return sectionDto;
        });
    } else {
      dto.sections = [];
    }

    return dto;
  }

  /**
   * Lấy danh sách khóa học PUBLISHED, có thể filter theo:
   * - categorySlug: slug của category (root hoặc sub-category)
   * - search: tìm theo title (case-insensitive)
   * - level: BEGINNER | INTERMEDIATE | ADVANCED
   * Kèm pagination.
   */
  async findPublicCourses(query: CourseQueryDto): Promise<PaginatedCoursesDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const skip = (page - 1) * limit;

    const qb = this.coursesRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.instructor', 'instructor')
      .leftJoinAndSelect('instructor.profile', 'profile')
      .leftJoinAndSelect('course.category', 'category')
      .where('course.status = :status', { status: CourseStatus.PUBLISHED });

    if (query.categorySlug) {
      // Tìm cả courses thuộc sub-category của category được chọn
      // Trước tiên tìm category theo slug, rồi lấy id của nó và các children
      const cat = await this.categoriesRepository.findOne({
        where: { slug: query.categorySlug, isActive: true },
        relations: ['children'],
      });

      if (!cat) {
        // Category không tồn tại → trả về rỗng
        const result = new PaginatedCoursesDto();
        result.data = [];
        result.meta = Object.assign(new PaginationMetaDto(), {
          total: 0,
          page,
          limit,
          totalPages: 0,
        });
        return result;
      }

      // Lấy id của category và tất cả children (nếu là root category)
      const categoryIds = [cat.id, ...cat.children.map((c) => c.id)];
      qb.andWhere('course.categoryId IN (:...categoryIds)', { categoryIds });
    }

    if (query.search) {
      qb.andWhere('LOWER(course.title) LIKE LOWER(:search)', {
        search: `%${query.search}%`,
      });
    }

    if (query.level) {
      qb.andWhere('course.level = :level', { level: query.level });
    }

    qb.orderBy('course.publishedAt', 'DESC')
      .addOrderBy('course.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [courses, total] = await qb.getManyAndCount();

    const meta = Object.assign(new PaginationMetaDto(), {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });

    const result = new PaginatedCoursesDto();
    result.data = courses.map((c) => this.toDto(c));
    result.meta = meta;
    return result;
  }

  /**
   * Lấy chi tiết một course theo slug (public).
   */
  async findBySlug(slug: string): Promise<CourseResponseDto> {
    const course = await this.coursesRepository.findOne({
      where: { slug, status: CourseStatus.PUBLISHED },
      relations: ['instructor', 'instructor.profile', 'category', 'sections', 'sections.lessons', 'sections.lessons.video'],
    });

    if (!course) {
      throw new NotFoundException(`Course "${slug}" không tồn tại`);
    }

    return this.toDto(course);
  }

  // ── Instructor Methods ──────────────────────────────────────────

  async findByInstructor(instructorId: number): Promise<CourseResponseDto[]> {
    const courses = await this.coursesRepository.find({
      where: { instructorId },
      relations: ['category'],
      order: { createdAt: 'DESC' },
    });
    return courses.map((c) => this.toDto(c));
  }

  async findInstructorCourseDetail(instructorId: number, id: number): Promise<CourseResponseDto> {
    const course = await this.coursesRepository.findOne({
      where: { id, instructorId },
      relations: ['category', 'sections', 'sections.lessons', 'sections.lessons.video'],
    });
    if (!course) throw new NotFoundException('Không tìm thấy khóa học');
    return this.toDto(course);
  }

  async createCourse(instructorId: number, dto: CreateCourseDto): Promise<CourseResponseDto> {
    const slug = dto.title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '') + '-' + Date.now();
    const course = this.coursesRepository.create({
      title: dto.title,
      slug,
      categoryId: dto.categoryId,
      instructorId,
      price: 0,
    });
    const saved = await this.coursesRepository.save(course);
    return this.toDto(saved);
  }

  async updateCourse(instructorId: number, id: number, dto: UpdateCourseDto): Promise<CourseResponseDto> {
    const course = await this.coursesRepository.findOne({ where: { id, instructorId } });
    if (!course) throw new NotFoundException('Không tìm thấy khóa học');
    
    Object.assign(course, dto);
    const saved = await this.coursesRepository.save(course);
    return this.toDto(saved);
  }

  async submitCourseForReview(instructorId: number, id: number): Promise<CourseResponseDto> {
    const course = await this.coursesRepository.findOne({ where: { id, instructorId } });
    if (!course) throw new NotFoundException('Không tìm thấy khóa học');
    
    course.status = CourseStatus.PENDING_REVIEW;
    const saved = await this.coursesRepository.save(course);
    return this.toDto(saved);
  }
}
