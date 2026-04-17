import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Section } from '../../database/entities/section.entity';
import { Course } from '../../database/entities/course.entity';

@Injectable()
export class SectionsService {
  constructor(
    @InjectRepository(Section)
    private readonly sectionsRepository: Repository<Section>,
    @InjectRepository(Course)
    private readonly coursesRepository: Repository<Course>,
  ) {}

  async createSection(
    instructorId: number,
    courseId: number,
    dto: { title: string; position?: number },
  ) {
    const course = await this.coursesRepository.findOne({
      where: { id: courseId, instructorId },
    });
    if (!course)
      throw new NotFoundException('Course not found or unauthorized');

    let position = dto.position;
    if (position === undefined) {
      const maxPosSection = await this.sectionsRepository.findOne({
        where: { courseId },
        order: { position: 'DESC' },
      });
      position = maxPosSection ? maxPosSection.position + 1 : 1;
    }

    const section = this.sectionsRepository.create({
      title: dto.title,
      position,
      courseId,
    });
    return this.sectionsRepository.save(section);
  }

  async updateSection(
    instructorId: number,
    id: number,
    dto: { title?: string; position?: number },
  ) {
    const section = await this.sectionsRepository.findOne({
      where: { id },
      relations: ['course'],
    });

    if (!section || section.course.instructorId !== instructorId) {
      throw new NotFoundException('Section not found or unauthorized');
    }

    if (dto.title) section.title = dto.title;
    if (dto.position !== undefined) section.position = dto.position;

    return this.sectionsRepository.save(section);
  }

  async deleteSection(instructorId: number, id: number) {
    const section = await this.sectionsRepository.findOne({
      where: { id },
      relations: ['course'],
    });

    if (!section || section.course.instructorId !== instructorId) {
      throw new NotFoundException('Section not found or unauthorized');
    }

    await this.sectionsRepository.remove(section);
    return { success: true };
  }
}
