import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LessonProgress } from '../../database/entities/lesson-progress.entity';
import { Enrollment } from '../../database/entities/enrollment.entity';
import { Lesson } from '../../database/entities/lesson.entity';
import { User } from '../../database/entities/user.entity';
import { UpsertProgressDto } from './dto/upsert-progress-request.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../database/entities/notification.entity';
import { Course } from '../../database/entities/course.entity';

@Injectable()
export class LessonProgressService {
  constructor(
    @InjectRepository(LessonProgress)
    private readonly progressRepo: Repository<LessonProgress>,
    @InjectRepository(Enrollment)
    private readonly enrollmentsRepo: Repository<Enrollment>,
    @InjectRepository(Lesson)
    private readonly lessonsRepo: Repository<Lesson>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async upsertProgress(user: User, dto: UpsertProgressDto) {
    // 1. Get Lesson with Course context
    const lesson = await this.lessonsRepo.findOne({
      where: { id: dto.lessonId },
      relations: ['section', 'section.course'],
    });
    if (!lesson) throw new NotFoundException('Không tìm thấy bài học');

    // 2. Get active enrollment
    const enrollment = await this.enrollmentsRepo.findOne({
      where: {
        student_id: user.id,
        course_id: lesson.section.courseId,
        is_active: true,
      },
    });
    if (!enrollment)
      throw new ForbiddenException('Bạn chưa đăng ký khóa học này');

    // 3. Upsert progress
    let progress = await this.progressRepo.findOne({
      where: { enrollment_id: enrollment.id, lesson_id: lesson.id },
    });

    if (!progress) {
      progress = this.progressRepo.create({
        enrollment_id: enrollment.id,
        lesson_id: lesson.id,
      });
    }

    if (dto.watchedDuration > progress.watched_duration) {
      progress.watched_duration = dto.watchedDuration;
    }
    progress.last_watched_at = new Date();

    if (dto.completed && !progress.completed) {
      progress.completed = true;
      progress.completed_at = new Date();
    }

    await this.progressRepo.save(progress);

    // 4. Update overall enrollment progress percent
    await this.updateEnrollmentProgress(enrollment.id, lesson.section.courseId);

    return progress;
  }

  async getEnrollmentProgress(enrollmentId: number) {
    return this.progressRepo.find({
      where: { enrollment_id: enrollmentId },
    });
  }

  private async updateEnrollmentProgress(
    enrollmentId: number,
    courseId: number,
  ) {
    // Get all lessons in course to calculate granular progress
    const allLessons = await this.lessonsRepo.find({
      where: { section: { courseId: courseId } },
    });

    if (allLessons.length === 0) return;

    // Get all progress records for this enrollment
    const progresses = await this.progressRepo.find({
      where: { enrollment_id: enrollmentId },
    });

    let totalValue = 0;
    allLessons.forEach((lesson) => {
      const prog = progresses.find((p) => p.lesson_id === lesson.id);
      if (prog) {
        if (prog.completed) {
          totalValue += 1;
        } else if (prog.watched_duration > 0 && lesson.durationSecs > 0) {
          // Add partial completion (capped at 0.99)
          totalValue += Math.min(prog.watched_duration / lesson.durationSecs, 0.99);
        }
      }
    });

    const percent = Math.floor((totalValue / allLessons.length) * 100);

    const enrollment = await this.enrollmentsRepo.findOne({
      where: { id: enrollmentId },
    });
    if (!enrollment) return;

    enrollment.progress_percent = percent;
    enrollment.last_accessed_at = new Date();
    enrollment.completed_at = percent === 100 ? new Date() : null;

    await this.enrollmentsRepo.save(enrollment);

    // Notify on 100% completion
    if (percent === 100 && !enrollment.completed_at) {
      try {
        const course = await this.lessonsRepo.manager.findOne(Course, {
          where: { id: courseId },
        });
        if (course) {
          await this.notificationsService.sendNotification(
            enrollment.student_id,
            NotificationType.ENROLLMENT,
            'Hoàn thành 100% khóa học!',
            `Tuyệt vời! Bạn đã hoàn thành 100% khóa học "${course.title}".`,
            { courseId, enrollmentId },
          );
        }
      } catch (e) {
        console.error('Failed to send completion notification:', e);
      }
    }
  }
}
