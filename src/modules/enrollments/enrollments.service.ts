import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment } from '../../database/entities/enrollment.entity';
import { User } from '../../database/entities/user.entity';
import { plainToInstance } from 'class-transformer';
import { EnrollmentResponseDto } from './dto/enrollment-response.dto';

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectRepository(Enrollment)
    private readonly enrollmentsRepo: Repository<Enrollment>,
  ) {}

  async findMyCourses(user: User): Promise<EnrollmentResponseDto[]> {
    console.log(`[EnrollmentsService] Fetching courses for student ${user.id}`);
    try {
      const enrollments = await this.enrollmentsRepo.find({
        where: { student_id: user.id, is_active: true },
        relations: ['course', 'course.instructor', 'course.instructor.profile'],
        order: { enrolled_at: 'DESC' },
      });

      console.log(`[EnrollmentsService] Found ${enrollments.length} enrollments`);

      return enrollments.map(e => {
        const data = {
          ...e,
          course: {
            ...e.course,
            instructor_name: e.course.instructor?.profile 
              ? e.course.instructor.profile.fullName
              : 'Instructor',
          }
        };
        return plainToInstance(EnrollmentResponseDto, data, { excludeExtraneousValues: true });
      });
    } catch (error: any) {
      console.error(`[EnrollmentsService] Error fetching courses:`, error);
      throw error;
    }
  }

  async directEnroll(
    courseId: number,
    enroller: User,
    targetStudentId?: number,
  ): Promise<EnrollmentResponseDto> {
    const course = (await this.enrollmentsRepo.manager.findOne('Course', {
      where: { id: courseId },
      relations: ['instructor', 'instructor.profile'],
    })) as any;
    if (!course) throw new NotFoundException('Không tìm thấy khóa học');

    const studentId = targetStudentId || enroller.id;

    // Check existing
    const existing = await this.enrollmentsRepo.findOne({
      where: { student_id: studentId, course_id: courseId, is_active: true },
    });
    if (existing)
      throw new BadRequestException('Người dùng đã được ghi danh vào khóa học này');

    const enrollment = this.enrollmentsRepo.create({
      student_id: studentId,
      course_id: courseId,
      enroller_id: enroller.id,
      is_active: true,
      enrolled_at: new Date(),
    });

    const saved = await this.enrollmentsRepo.save(enrollment);

    // Map response
    const data = {
      ...saved,
      course: {
        ...course,
        instructor_name: course.instructor?.profile?.fullName || 'Instructor',
      },
    };
    return plainToInstance(EnrollmentResponseDto, data, {
      excludeExtraneousValues: true,
    });
  }
}
