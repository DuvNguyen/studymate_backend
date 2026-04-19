import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, TreeRepository, Like } from 'typeorm';
import { LessonDiscussion } from '../../database/entities/lesson-discussion.entity';
import { Enrollment } from '../../database/entities/enrollment.entity';
import { User } from '../../database/entities/user.entity';
import { CreateDiscussionDto } from './dto/create-discussion-request.dto';
import { DiscussionResponseDto } from './dto/discussion-response.dto';
import { plainToInstance } from 'class-transformer';
import { RoleName } from '../../common/constants/role.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../database/entities/notification.entity';
import { Course } from '../../database/entities/course.entity';
import { Lesson } from '../../database/entities/lesson.entity';

@Injectable()
export class DiscussionsService {
  constructor(
    @InjectRepository(LessonDiscussion)
    private readonly discussionsRepo: TreeRepository<LessonDiscussion>,
    @InjectRepository(Enrollment)
    private readonly enrollmentsRepo: Repository<Enrollment>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(
    user: User,
    dto: CreateDiscussionDto,
  ): Promise<DiscussionResponseDto> {
    // 1. Verify Enrollment (Only students who bought the course or Admin/Staff/Instructor)
    if (user.role.roleName === 'STUDENT') {
      const isEnrolled = await this.enrollmentsRepo.findOne({
        where: {
          student_id: user.id,
          course_id: dto.courseId,
          is_active: true,
        },
      });
      if (!isEnrolled) {
        throw new ForbiddenException(
          'Bạn phải đăng ký khóa học mới có thể thảo luận',
        );
      }

      // 2. Enforce 5 comments limit per lesson
      const count = await this.discussionsRepo.count({
        where: { user_id: user.id, lesson_id: dto.lessonId },
      });
      if (count >= 5) {
        throw new BadRequestException(
          'Bạn đã đạt giới hạn 5 bình luận cho bài học này',
        );
      }
    }

    // 3. Create Discussion
    const discussionData: Partial<LessonDiscussion> = {
      course_id: dto.courseId,
      lesson_id: dto.lessonId,
      user_id: user.id,
      content: dto.content,
      parent_id: dto.parentId || undefined,
    };
    const discussion = this.discussionsRepo.create(discussionData);

    if (dto.parentId) {
      const parent = await this.discussionsRepo.findOne({
        where: { id: dto.parentId },
      });
      if (!parent) throw new NotFoundException('Không tìm thấy bình luận cha');
      discussion.parent = parent;
    }

    const saved = await this.discussionsRepo.save(discussion);

    // Reload to get relations
    const full = await this.discussionsRepo.findOne({
      where: { id: saved.id },
      relations: ['user', 'user.profile'],
    });

    if (!full) throw new NotFoundException('Lỗi lưu thảo luận');

    // Send notifications in the background
    this.sendDiscussionNotifications(saved, user, dto);

    return plainToInstance(DiscussionResponseDto, {
      ...full,
      content: full.content,
      user: {
        id: full.user.id,
        fullName: full.user.profile?.fullName || full.user.email.split('@')[0] || 'Anonymous',
        avatarUrl: full.user.avatarUrl,
        role: { roleName: full.user.role?.roleName || 'STUDENT' },
      },
    });
  }

  private async sendDiscussionNotifications(
    discussion: LessonDiscussion,
    user: User,
    dto: CreateDiscussionDto,
  ) {
    try {
      const authorName = user.profile?.fullName || user.email?.split('@')[0] || 'Người dùng';

      // If it's a reply, notify the parent comment author
      if (dto.parentId) {
        const parent = await this.discussionsRepo.findOne({
          where: { id: dto.parentId },
        });
        if (parent && parent.user_id !== user.id) {
          await this.notificationsService.sendNotification(
            parent.user_id,
            NotificationType.COMMUNITY,
            'Trả lời mới!',
            `${authorName} đã trả lời bình luận của bạn. Xem ngay!`,
            { discussionId: discussion.id, lessonId: dto.lessonId, courseId: dto.courseId },
          );
        }
      }
    } catch (e) {
      // Non-critical, log but don't fail
      console.error('Failed to send discussion notification:', e);
    }
  }

  async getLessonDiscussions(
    lessonId: number,
  ): Promise<DiscussionResponseDto[]> {
    interface DiscussionTree extends LessonDiscussion {
      children: DiscussionTree[];
    }

    const roots = await this.discussionsRepo.findRoots({
      relations: ['user', 'user.profile'],
    });

    const lessonRoots = roots.filter((r) => r.lesson_id === lessonId);

    const results: DiscussionTree[] = [];
    for (const root of lessonRoots) {
      const tree = await this.discussionsRepo.findDescendantsTree(root, {
        relations: ['user', 'user.profile'],
      });
      results.push(tree as DiscussionTree);
    }

    return results.map((t) => this.mapToDto(t));
  }

  async markBestAnswer(id: number, user: User) {
    const discussion = await this.discussionsRepo.findOne({
      where: { id },
      relations: ['course'],
    });

    if (!discussion) throw new NotFoundException('Không tìm thấy thảo luận');

    // Only instructor, staff or admin can mark best answer
    const isAdminOrStaff = [RoleName.ADMIN, RoleName.STAFF].includes(
      user.role.roleName as RoleName,
    );
    const isInstructor = discussion.user_id === user.id; // Or check if instructor of this course

    // Simplified check: only check role for now
    if (!isAdminOrStaff && user.role.roleName !== RoleName.INSTRUCTOR) {
      throw new ForbiddenException('Bạn không có quyền thực hiện hành động này');
    }

    discussion.is_best_answer = !discussion.is_best_answer;
    return this.discussionsRepo.save(discussion);
  }

  async softDelete(id: number, user: User) {
    const discussion = await this.discussionsRepo.findOne({
      where: { id },
      relations: ['user', 'user.role'],
    });

    if (!discussion) throw new NotFoundException('Không tìm thấy thảo luận');

    const isAdminOrStaff = [RoleName.ADMIN, RoleName.STAFF].includes(
      user.role.roleName as RoleName,
    );
    const isOwner = discussion.user_id === user.id;

    if (!isAdminOrStaff && !isOwner) {
      throw new ForbiddenException('Bạn không có quyền xóa thảo luận này');
    }

    discussion.is_deleted = true;
    discussion.content = ''; // Clear content for privacy but keep record
    return this.discussionsRepo.save(discussion);
  }

  async update(id: number, content: string, user: User) {
    const discussion = await this.discussionsRepo.findOne({
      where: { id },
    });

    if (!discussion) throw new NotFoundException('Không tìm thấy thảo luận');
    if (discussion.is_deleted)
      throw new BadRequestException('Không thể chỉnh sửa bình luận đã xóa');

    if (discussion.user_id !== user.id) {
      throw new ForbiddenException(
        'Bạn không có quyền chỉnh sửa thảo luận này',
      );
    }

    discussion.content = content;
    discussion.is_edited = true;
    return this.discussionsRepo.save(discussion);
  }

  async search(
    courseId: number,
    keyword: string,
  ): Promise<DiscussionResponseDto[]> {
    const discussions = await this.discussionsRepo.find({
      where: {
        course_id: courseId,
        content: Like(`%${keyword}%`),
      },
      relations: ['user', 'user.profile'],
      order: { created_at: 'DESC' },
    });

    return discussions.map((d) => this.mapToDto(d));
  }

  private mapToDto(d: LessonDiscussion): DiscussionResponseDto {
    const content = d.is_deleted ? '_Bình luận không có sẵn_' : d.content;
    const fullName = d.is_deleted
      ? '[Người dùng đã xóa]'
      : d.user?.profile?.fullName || d.user?.email?.split('@')[0] || 'Anonymous';

    return plainToInstance(DiscussionResponseDto, {
      ...d,
      content,
      user: {
        id: d.user?.id,
        fullName,
        avatarUrl: d.is_deleted ? null : d.user?.avatarUrl,
        role: { roleName: d.user?.role?.roleName || 'STUDENT' },
      },
      children: d.children ? d.children.map((c) => this.mapToDto(c)) : [],
    });
  }
}
