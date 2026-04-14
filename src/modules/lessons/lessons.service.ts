import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson } from '../../database/entities/lesson.entity';
import { Section } from '../../database/entities/section.entity';
import { Video } from '../../database/entities/video.entity';

@Injectable()
export class LessonsService {
  constructor(
    @InjectRepository(Lesson)
    private readonly lessonsRepository: Repository<Lesson>,
    @InjectRepository(Section)
    private readonly sectionsRepository: Repository<Section>,
    @InjectRepository(Video)
    private readonly videosRepository: Repository<Video>,
  ) {}

  async createLesson(instructorId: number, sectionId: number, dto: { title: string; videoId?: number; content?: string; isPreview?: boolean; position?: number }) {
    const section = await this.sectionsRepository.findOne({
      where: { id: sectionId },
      relations: ['course'],
    });

    if (!section || section.course.instructorId !== instructorId) {
      throw new NotFoundException('Section not found or unauthorized');
    }

    let defaultDuration = 0;
    if (dto.videoId) {
      const video = await this.videosRepository.findOne({ where: { id: dto.videoId, uploaderId: instructorId, status: 'APPROVED' as any } });
      if (!video) throw new BadRequestException('Video cannot be attached. Make sure it is approved and belongs to you.');
      defaultDuration = video.durationSecs || 0;
    }

    let position = dto.position;
    if (position === undefined) {
      const maxPosLesson = await this.lessonsRepository.findOne({
        where: { sectionId },
        order: { position: 'DESC' },
      });
      position = maxPosLesson ? maxPosLesson.position + 1 : 1;
    }

    const lesson = this.lessonsRepository.create({
      title: dto.title,
      sectionId,
      videoId: dto.videoId || null,
      content: dto.content,
      isPreview: dto.isPreview || false,
      position,
      durationSecs: defaultDuration,
    });
    return this.lessonsRepository.save(lesson);
  }

  async updateLesson(instructorId: number, id: number, dto: { title?: string; videoId?: number; content?: string; isPreview?: boolean; position?: number }) {
    const lesson = await this.lessonsRepository.findOne({
      where: { id },
      relations: ['section', 'section.course'],
    });

    if (!lesson || lesson.section.course.instructorId !== instructorId) {
      throw new NotFoundException('Lesson not found or unauthorized');
    }

    if (dto.videoId !== undefined) {
      if (dto.videoId === null) {
        lesson.videoId = null;
        lesson.durationSecs = 0;
      } else {
        const video = await this.videosRepository.findOne({ where: { id: dto.videoId, uploaderId: instructorId, status: 'APPROVED' as any } });
        if (!video) throw new BadRequestException('Video cannot be attached. Make sure it is approved and belongs to you.');
        lesson.videoId = dto.videoId;
        lesson.durationSecs = video.durationSecs || 0;
      }
    }

    if (dto.title !== undefined) lesson.title = dto.title;
    if (dto.content !== undefined) lesson.content = dto.content;
    if (dto.isPreview !== undefined) lesson.isPreview = dto.isPreview;
    if (dto.position !== undefined) lesson.position = dto.position;

    return this.lessonsRepository.save(lesson);
  }

  async deleteLesson(instructorId: number, id: number) {
    const lesson = await this.lessonsRepository.findOne({
      where: { id },
      relations: ['section', 'section.course'],
    });

    if (!lesson || lesson.section.course.instructorId !== instructorId) {
      throw new NotFoundException('Lesson not found or unauthorized');
    }

    await this.lessonsRepository.remove(lesson);
    return { success: true };
  }
}
