import { Injectable } from '@nestjs/common';
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
}
