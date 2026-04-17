import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from '../../database/entities/wishlist.entity';
import { Course } from '../../database/entities/course.entity';
import { WishlistResponseDto, WishlistCheckResponseDto } from './dto/wishlist-response.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  async findAll(studentId: number): Promise<WishlistResponseDto[]> {
    const items = await this.wishlistRepository.find({
      where: { studentId },
      relations: ['course', 'course.instructor', 'course.instructor.profile', 'course.category'],
      order: { addedAt: 'DESC' },
    });

    return items.map((item) => {
      const dto = plainToInstance(WishlistResponseDto, item, {
        excludeExtraneousValues: true,
      });

      // Map fullName từ profile sang instructor DTO (vì DTO mong đợi flattened field)
      if (dto.course && dto.course.instructor) {
        dto.course.instructor.fullName =
          (item.course.instructor as any)?.profile?.fullName ?? null;
      }

      return dto;
    });
  }

  async toggleWishlist(
    studentId: number,
    courseId: number,
    forceStatus?: boolean,
  ): Promise<WishlistCheckResponseDto> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException('Không tìm thấy khóa học');

    const existing = await this.wishlistRepository.findOne({
      where: { studentId, courseId },
    });

    const shouldRemove = forceStatus === false || (forceStatus === undefined && existing);

    if (shouldRemove) {
      if (existing) await this.wishlistRepository.remove(existing);
      return { isInWishlist: false };
    } else {
      if (!existing) {
        const newItem = this.wishlistRepository.create({ studentId, courseId });
        await this.wishlistRepository.save(newItem);
      }
      return { isInWishlist: true };
    }
  }

  async checkWishlist(studentId: number, courseId: number): Promise<WishlistCheckResponseDto> {
    const existing = await this.wishlistRepository.findOne({
      where: { studentId, courseId },
    });

    return { isInWishlist: !!existing };
  }
}
