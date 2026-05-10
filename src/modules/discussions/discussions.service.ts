import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, TreeRepository, Like } from 'typeorm';
import { LessonDiscussion } from '../../database/entities/lesson-discussion.entity';
import { DiscussionVote } from '../../database/entities/discussion-vote.entity';
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
    @InjectRepository(DiscussionVote)
    private readonly discussionVotesRepo: Repository<DiscussionVote>,
    @InjectRepository(Enrollment)
    private readonly enrollmentsRepo: Repository<Enrollment>,
    @InjectRepository(Course)
    private readonly coursesRepo: Repository<Course>,
    @InjectRepository(Lesson)
    private readonly lessonsRepo: Repository<Lesson>,
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

      // 1. If it's a reply, notify the parent comment author
      if (dto.parentId) {
        const parent = await this.discussionsRepo.findOne({
          where: { id: dto.parentId },
          relations: ['user'],
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
      // 2. If it's a NEW question (root), notify the instructor
      else {
        const course = await this.coursesRepo.findOne({ 
          where: { id: dto.courseId },
          relations: ['instructor'],
        });
        
        if (course && course.instructorId !== user.id) {
          await this.notificationsService.sendNotification(
            course.instructorId,
            NotificationType.COMMUNITY,
            'Câu hỏi mới từ học viên!',
            `${authorName} đã đặt một câu hỏi mới trong khóa học "${course.title}".`,
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
    user: User,
  ): Promise<DiscussionResponseDto[]> {
    interface DiscussionTree extends LessonDiscussion {
      children: DiscussionTree[];
    }

    const roots = await this.discussionsRepo.findRoots({
      relations: ['user', 'user.profile'],
    });

    const lessonRoots = roots.filter((r) => r.lesson_id === lessonId);

    // Fetch all votes of the current user for discussions in this lesson
    // We can just fetch all votes by this user and filter by the fetched discussion IDs
    const userVotes = await this.discussionVotesRepo.find({
      where: { user_id: user.id },
    });
    const voteMap = new Map<number, number>();
    for (const v of userVotes) {
      voteMap.set(v.discussion_id, v.value);
    }

    const results: DiscussionTree[] = [];
    for (const root of lessonRoots) {
      const tree = await this.discussionsRepo.findDescendantsTree(root, {
        relations: ['user', 'user.profile'],
      });
      results.push(tree as DiscussionTree);
    }

    return results.map((t) => this.mapToDto(t, voteMap));
  }

  async markBestAnswer(id: number, user: User) {
    const discussion = await this.discussionsRepo.findOne({
      where: { id },
      relations: ['course'],
    });

    if (!discussion) throw new NotFoundException('Không tìm thấy thảo luận');

    // Only instructor can mark best answer
    if (user.role.roleName !== RoleName.INSTRUCTOR) {
      throw new ForbiddenException('Chỉ có Giảng viên mới được đánh dấu câu trả lời đúng');
    }

    discussion.is_best_answer = !discussion.is_best_answer;
    return this.discussionsRepo.save(discussion);
  }

  async voteDiscussion(id: number, value: number, user: User) {
    if (![1, -1, 0].includes(value)) {
      throw new BadRequestException('Giá trị vote không hợp lệ');
    }

    const discussion = await this.discussionsRepo.findOne({ where: { id } });
    if (!discussion) throw new NotFoundException('Không tìm thấy thảo luận');
    if (discussion.is_deleted) throw new BadRequestException('Không thể vote bình luận đã xóa');

    let vote = await this.discussionVotesRepo.findOne({
      where: { discussion_id: id, user_id: user.id },
    });

    const oldValue = vote ? vote.value : 0;

    if (value === 0) {
      if (vote) {
        await this.discussionVotesRepo.remove(vote);
      }
    } else {
      if (vote) {
        vote.value = value;
        await this.discussionVotesRepo.save(vote);
      } else {
        vote = this.discussionVotesRepo.create({
          discussion_id: id,
          user_id: user.id,
          value,
        });
        await this.discussionVotesRepo.save(vote);
      }
    }

    // Update discussion counters
    if (oldValue === 1) discussion.upvotes -= 1;
    if (oldValue === -1) discussion.downvotes -= 1;

    if (value === 1) discussion.upvotes += 1;
    if (value === -1) discussion.downvotes += 1;

    // Prevent negative counts just in case
    discussion.upvotes = Math.max(0, discussion.upvotes);
    discussion.downvotes = Math.max(0, discussion.downvotes);

    await this.discussionsRepo.save(discussion);

    return { upvotes: discussion.upvotes, downvotes: discussion.downvotes, userVote: value };
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

  async getInstructorDiscussions(
    user: User,
    page: number = 1,
    limit: number = 20,
  ) {
    const qb = this.discussionsRepo.createQueryBuilder('d')
      .innerJoinAndSelect('d.course', 'course')
      .innerJoinAndSelect('d.lesson', 'lesson')
      .leftJoinAndSelect('d.user', 'user')
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('user.role', 'role')
      .where('course.instructorId = :instructorId', { instructorId: user.id })
      .andWhere('d.parent_id IS NULL')
      .orderBy('d.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [roots, total] = await qb.getManyAndCount();

    // Map to DTOs
    const results = await Promise.all(
      roots.map(async (root) => {
        // Load tree for each root to get replies
        const tree = await this.discussionsRepo.findDescendantsTree(root, {
          relations: ['user', 'user.profile', 'user.role'],
        });
        return this.mapToDto(tree, new Map());
      }),
    );

    return {
      data: results,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
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

    return discussions.map((d) => this.mapToDto(d, new Map()));
  }

  private mapToDto(d: LessonDiscussion, voteMap: Map<number, number>): DiscussionResponseDto {
    const content = d.is_deleted ? '_Bình luận không có sẵn_' : d.content;
    const fullName = d.is_deleted
      ? '[Người dùng đã xóa]'
      : d.user?.profile?.fullName || d.user?.email?.split('@')[0] || 'Anonymous';

    return plainToInstance(DiscussionResponseDto, {
      ...d,
      content,
      upvotes: d.upvotes || 0,
      downvotes: d.downvotes || 0,
      userVote: voteMap.get(d.id) || 0,
      course: d.course ? {
        id: d.course.id,
        title: d.course.title,
        slug: d.course.slug,
      } : undefined,
      lesson: d.lesson ? {
        id: d.lesson.id,
        title: d.lesson.title,
      } : undefined,
      user: {
        id: d.user?.id,
        fullName,
        avatarUrl: d.is_deleted ? null : d.user?.avatarUrl,
        role: { roleName: d.user?.role?.roleName || 'STUDENT' },
      },
      children: d.children ? d.children.map((c) => this.mapToDto(c, voteMap)) : [],
    });
  }
}
