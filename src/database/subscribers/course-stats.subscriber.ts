import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  RemoveEvent,
  UpdateEvent,
} from 'typeorm';
import { Lesson } from '../entities/lesson.entity';
import { Section } from '../entities/section.entity';
import { Course } from '../entities/course.entity';

@EventSubscriber()
export class CourseStatsSubscriber implements EntitySubscriberInterface {

  async afterInsert(event: InsertEvent<Lesson | Section>) {
    await this.updateCourseStats(event);
  }

  async afterUpdate(event: UpdateEvent<Lesson | Section>) {
    await this.updateCourseStats(event);
  }

  async afterRemove(event: RemoveEvent<Lesson | Section>) {
    await this.updateCourseStats(event);
  }

  private isLesson(entity: unknown): entity is Lesson {
    return (
      entity instanceof Lesson ||
      (entity != null &&
        typeof entity === 'object' &&
        'sectionId' in entity &&
        'durationSecs' in entity)
    );
  }

  private isSection(entity: unknown): entity is Section {
    return (
      entity instanceof Section ||
      (entity != null &&
        typeof entity === 'object' &&
        'courseId' in entity &&
        !('sectionId' in entity))
    );
  }

  private async updateCourseStats(
    event:
      | InsertEvent<Lesson | Section>
      | UpdateEvent<Lesson | Section>
      | RemoveEvent<Lesson | Section>,
  ) {
    const manager = event.manager;
    const entity = event.entity;
    const databaseEntity = 'databaseEntity' in event ? event.databaseEntity : undefined;
    let courseId: number | undefined;

    // Type narrowing to find courseId
    if (this.isLesson(entity)) {
      const section = await manager.findOne(Section, {
        where: { id: entity.sectionId },
        select: ['courseId'],
      });
      courseId = section?.courseId;
    } else if (this.isSection(entity)) {
      courseId = entity.courseId;
    } else if (this.isLesson(databaseEntity)) {
      const section = await manager.findOne(Section, {
        where: { id: (databaseEntity as Lesson).sectionId },
        select: ['courseId'],
      });
      courseId = section?.courseId;
    } else if (this.isSection(databaseEntity)) {
      courseId = (databaseEntity as Section).courseId;
    }

    if (!courseId) return;

    // Recalculate stats — using query builder for better performance
    const sections = await manager.find(Section, {
      where: { courseId },
      relations: ['lessons'],
    });

    const stats = sections.reduce(
      (acc, s) => {
        const lessons = s.lessons || [];
        acc.totalDuration += lessons.reduce(
          (sum, l) => sum + (l.durationSecs || 0),
          0,
        );
        acc.lessonCount += lessons.length;
        return acc;
      },
      { totalDuration: 0, lessonCount: 0 },
    );

    await manager.update(Course, courseId, {
      totalDuration: stats.totalDuration,
      lessonCount: stats.lessonCount,
      sectionCount: sections.length,
    });

    console.log(
      `[CourseStatsSubscriber] Course ${courseId} synced: ${stats.lessonCount} lessons, ${stats.totalDuration}s duration, ${sections.length} sections`,
    );
  }
}
