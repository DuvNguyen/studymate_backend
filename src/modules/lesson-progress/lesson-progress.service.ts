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

@Injectable()
export class LessonProgressService {
  constructor(
    @InjectRepository(LessonProgress)
    private readonly progressRepo: Repository<LessonProgress>,
    @InjectRepository(Enrollment)
    private readonly enrollmentsRepo: Repository<Enrollment>,
    @InjectRepository(Lesson)
    private readonly lessonsRepo: Repository<Lesson>,
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
    // Count total lessons
    const totalLessons = await this.lessonsRepo.count({
      where: { section: { courseId: courseId } },
    });

    if (totalLessons === 0) return;

    // Count completed lessons
    const completedLessons = await this.progressRepo.count({
      where: { enrollment_id: enrollmentId, completed: true },
    });

    const percent = Math.round((completedLessons / totalLessons) * 100);

    const enrollment = await this.enrollmentsRepo.findOne({
      where: { id: enrollmentId },
    });
    if (!enrollment) return;

    enrollment.progress_percent = percent;
    enrollment.last_accessed_at = new Date();
    enrollment.completed_at = percent === 100 ? new Date() : null;

    await this.enrollmentsRepo.save(enrollment);
  }
}
