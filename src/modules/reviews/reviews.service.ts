import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Review } from '../../database/entities/review.entity';
import { Course } from '../../database/entities/course.entity';
import { User } from '../../database/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../database/entities/notification.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private reviewsRepo: Repository<Review>,
    @InjectRepository(Course)
    private coursesRepo: Repository<Course>,
    private dataSource: DataSource,
    private notificationsService: NotificationsService,
  ) {}

  async create(data: { courseId: number; rating: number; comment?: string }, user: User) {
    // Check if user already reviewed this course
    const existingReview = await this.reviewsRepo.findOne({
      where: { userId: user.id, course_id: data.courseId },
    });

    if (existingReview) {
      throw new BadRequestException('Bạn đã đánh giá khóa học này rồi');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const review = this.reviewsRepo.create({
        userId: user.id,
        course_id: data.courseId,
        rating: data.rating,
        comment: data.comment,
      });
      await queryRunner.manager.save(review);

      // Update Course stats
      const course = await queryRunner.manager.findOne(Course, {
        where: { id: data.courseId },
      });

      if (!course) {
        throw new NotFoundException('Khóa học không tồn tại');
      }

      // Recalculate average rating
      const reviews = await queryRunner.manager.find(Review, {
        where: { course_id: data.courseId, isPublished: true },
      });

      const totalRating = reviews.reduce((acc, r) => acc + r.rating, 0);
      course.reviewCount = reviews.length;
      course.avgRating = reviews.length > 0 ? Number((totalRating / reviews.length).toFixed(2)) : 0;

      await queryRunner.manager.save(course);

      await queryRunner.commitTransaction();

      // Notify instructor about new review
      if (course.instructorId) {
        await this.notificationsService.sendNotification(
          course.instructorId,
          NotificationType.REVIEW,
          'Đánh giá mới!',
          `Khóa học "${course.title}" vừa nhận được một đánh giá ${data.rating} sao mới.`,
          { courseId: data.courseId, reviewId: review.id, rating: data.rating },
        );
      }

      return review;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAllByCourse(courseId: number) {
    return this.reviewsRepo.find({
      where: { course_id: courseId, isPublished: true },
      relations: ['user', 'user.profile'],
      order: { createdAt: 'DESC' },
    });
  }

  async delete(id: number, userId: number) {
    const review = await this.reviewsRepo.findOne({ where: { id, userId } });
    if (!review) throw new NotFoundException('Đánh giá không tồn tại');
    return this.reviewsRepo.remove(review);
  }
}
