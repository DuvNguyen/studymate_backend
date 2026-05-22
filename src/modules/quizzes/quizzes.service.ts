import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, FindOptionsWhere, IsNull, Not } from 'typeorm';
import { Quiz } from '../../database/entities/quiz.entity';
import { QuizAttempt } from '../../database/entities/quiz-attempt.entity';
import {
  QuestionBankQuestion,
  QuestionDifficulty,
  QuestionType,
} from '../../database/entities/question-bank-question.entity';
import { QuestionBank } from '../../database/entities/question-bank.entity';
import { Enrollment } from '../../database/entities/enrollment.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../database/entities/notification.entity';

interface QuizSnapshotOption {
  id: number;
  text: string;
}

interface QuizSnapshotItem {
  id: number;
  text: string;
  type: QuestionType;
  points: number;
  options: QuizSnapshotOption[];
}

type SubmitAnswerValue = number | string | Array<number | string>;
type SubmitAnswersMap = Record<string, SubmitAnswerValue>;
export type SubmitAnswersPayload =
  | { answers?: SubmitAnswersMap }
  | SubmitAnswersMap;

@Injectable()
export class QuizzesService {
  constructor(
    @InjectRepository(Quiz)
    private quizRepository: Repository<Quiz>,
    @InjectRepository(QuizAttempt)
    private attemptRepository: Repository<QuizAttempt>,
    @InjectRepository(QuestionBank)
    private bankRepository: Repository<QuestionBank>,
    @InjectRepository(QuestionBankQuestion)
    private questionRepository: Repository<QuestionBankQuestion>,
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    private notificationsService: NotificationsService,
  ) {}

  private parseSnapshots(raw: unknown): QuizSnapshotItem[] {
    if (!Array.isArray(raw)) return [];
    return raw.filter((item): item is QuizSnapshotItem => {
      if (!item || typeof item !== 'object') return false;
      const snapshot = item as Partial<QuizSnapshotItem>;
      return (
        typeof snapshot.id === 'number' &&
        typeof snapshot.text === 'string' &&
        typeof snapshot.points === 'number' &&
        Array.isArray(snapshot.options)
      );
    });
  }

  private parseAnswersMap(payload: SubmitAnswersPayload): SubmitAnswersMap {
    if (!payload || typeof payload !== 'object') return {};
    const wrapped = payload as { answers?: unknown };
    if (wrapped.answers && typeof wrapped.answers === 'object') {
      return wrapped.answers as SubmitAnswersMap;
    }
    return payload as SubmitAnswersMap;
  }

  private async getActiveEnrollmentOrThrow(courseId: number, userId: number) {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { course_id: courseId, student_id: userId, is_active: true },
    });

    if (!enrollment) {
      throw new ForbiddenException('Bạn chưa đăng ký khóa học này');
    }

    return enrollment;
  }

  private async assertFinalQuizEligibility(quiz: Quiz, userId: number) {
    const enrollment = await this.getActiveEnrollmentOrThrow(
      quiz.courseId,
      userId,
    );

    if (enrollment.progress_percent < 80) {
      throw new BadRequestException(
        'BẠN CẦN HOÀN THÀNH ÍT NHẤT 80% KHÓA HỌC TRƯỚC KHI LÀM BÀI KIỂM TRA CUỐI KHÓA',
      );
    }

    const chapterQuizzes = await this.quizRepository.find({
      where: {
        courseId: quiz.courseId,
        isFinal: false,
        isActive: true,
        sectionId: Not(IsNull()),
      },
      select: ['id'],
    });

    if (chapterQuizzes.length === 0) return;

    const passedAttempts = await this.attemptRepository.find({
      where: {
        quizId: In(chapterQuizzes.map((chapterQuiz) => chapterQuiz.id)),
        userId,
        isPassed: true,
        completedAt: Not(IsNull()),
      },
      select: ['quizId'],
    });

    const passedQuizIds = new Set(
      passedAttempts.map((attempt) => Number(attempt.quizId)),
    );
    const hasUnpassedChapterQuiz = chapterQuizzes.some(
      (chapterQuiz) => !passedQuizIds.has(Number(chapterQuiz.id)),
    );

    if (hasUnpassedChapterQuiz) {
      throw new BadRequestException(
        'BẠN CẦN HOÀN THÀNH TẤT CẢ BÀI KIỂM TRA CHƯƠNG TRƯỚC KHI LÀM BÀI KIỂM TRA CUỐI KHÓA',
      );
    }
  }

  private async countCompletedAttempts(quizId: number, userId: number) {
    return this.attemptRepository.count({
      where: { quizId, userId, completedAt: Not(IsNull()) },
    });
  }

  private isAttemptExpired(
    attempt: QuizAttempt,
    quiz: Quiz,
    now = new Date(),
  ) {
    if (!quiz.timeLimit || quiz.timeLimit <= 0) return false;
    const expiresAt = new Date(
      attempt.startedAt.getTime() + quiz.timeLimit * 60 * 1000,
    );
    return now > expiresAt;
  }

  private async getUnsubmittedAttempt(quizId: number, userId: number) {
    return this.attemptRepository.findOne({
      where: { quizId, userId, completedAt: IsNull() },
      order: { startedAt: 'DESC' },
      relations: ['quiz'],
    });
  }

  async getQuizzesByCourse(courseId: number) {
    return this.quizRepository.find({
      where: { courseId, isActive: true },
      order: { sectionId: 'ASC', id: 'ASC' },
      relations: ['section'],
    });
  }

  async getQuiz(id: number) {
    const quiz = await this.quizRepository.findOne({
      where: { id },
      relations: ['bank', 'course'],
    });
    if (!quiz) throw new NotFoundException('Không tìm thấy bài kiểm tra');
    return quiz;
  }

  async getUserAttempts(quizId: number, userId: number) {
    return this.attemptRepository.find({
      where: { quizId, userId },
      order: { startedAt: 'DESC' },
    });
  }

  async startAttempt(quizId: number, userId: number) {
    console.log(
      `[QuizzesService] startAttempt called for quizId: ${quizId}, userId: ${userId}`,
    );
    const quiz = await this.getQuiz(quizId);
    console.log(`[QuizzesService] Quiz found: ${quiz?.title}`);

    if (quiz.isFinal) {
      await this.assertFinalQuizEligibility(quiz, userId);

      const activeAttempt = await this.getUnsubmittedAttempt(quizId, userId);
      if (activeAttempt && !this.isAttemptExpired(activeAttempt, quiz)) {
        return activeAttempt;
      }

      const completedAttempts = await this.countCompletedAttempts(
        quizId,
        userId,
      );
      console.log(
        `[QuizzesService] Completed final attempts count: ${completedAttempts}`,
      );
      if (completedAttempts >= 2) {
        throw new BadRequestException(
          'BẠN ĐÃ HẾT LƯỢT LÀM BÀI KIỂM TRA CUỐI KHÓA (TỐI ĐA 2 LẦN)',
        );
      }
    }

    // Pick random questions from bank
    let picked: QuestionBankQuestion[] = [];
    const isCustom = quiz.numEasy + quiz.numMedium + quiz.numHard > 0;

    if (isCustom) {
      console.log(
        `[QuizzesService] Custom mode active. Easy:${quiz.numEasy}, Med:${quiz.numMedium}, Hard:${quiz.numHard}`,
      );
      // Logic for Custom distribution
      const difficultyMap: Array<{ type: QuestionDifficulty; count: number }> =
        [
          { type: QuestionDifficulty.EASY, count: quiz.numEasy },
          { type: QuestionDifficulty.MEDIUM, count: quiz.numMedium },
          { type: QuestionDifficulty.HARD, count: quiz.numHard },
        ];

      for (const diff of difficultyMap) {
        if (diff.count > 0) {
          const where: FindOptionsWhere<QuestionBankQuestion> = {
            bankId: quiz.bankId,
            isActive: true,
            difficulty: diff.type,
          };
          if (quiz.sectionId) {
            where.sectionId = quiz.sectionId;
          }
          const questions = await this.questionRepository.find({
            where,
            relations: ['options'],
          });
          console.log(
            `[QuizzesService] Found ${questions.length} questions for ${diff.type}`,
          );
          // Shuffle subset and take required count
          const shuffled = questions.sort(() => 0.5 - Math.random());
          picked = [
            ...picked,
            ...shuffled.slice(0, Math.min(diff.count, questions.length)),
          ];
        }
      }
      // Shuffle combined set
      picked = picked.sort(() => 0.5 - Math.random());
    } else {
      console.log(
        `[QuizzesService] Random mode active. Priority: ${quiz.difficulty || 'NONE'}`,
      );
      // Original Random logic
      const where: FindOptionsWhere<QuestionBankQuestion> = {
        bankId: quiz.bankId,
        isActive: true,
      };
      if (quiz.sectionId) where.sectionId = quiz.sectionId;
      if (quiz.difficulty)
        where.difficulty = quiz.difficulty as QuestionDifficulty;

      const allQuestions = await this.questionRepository.find({
        where,
        relations: ['options'],
      });
      console.log(
        `[QuizzesService] Total matching questions: ${allQuestions.length}`,
      );

      if (allQuestions.length === 0) {
        throw new BadRequestException(
          'NGÂN HÀNG CÂU HỎI TRỐNG, VUI LÒNG LIÊN HỆ GIẢNG VIÊN',
        );
      }

      const shuffled = allQuestions.sort(() => 0.5 - Math.random());
      picked = shuffled.slice(
        0,
        Math.min(quiz.numQuestions, allQuestions.length),
      );
    }

    console.log(`[QuizzesService] Final picked count: ${picked.length}`);

    // Prepare snapshots (randomize options too)
    const snapshots = picked.map((q) => {
      const correctOptions = q.options.filter((o) => o.isCorrect);
      const incorrectOptions = q.options.filter((o) => !o.isCorrect);

      // Pick 1 correct option (randomly if multiple exist)
      const pickedCorrect = correctOptions
        .sort(() => 0.5 - Math.random())
        .slice(0, 1);

      // Pick 3 random incorrect options
      const pickedIncorrect = incorrectOptions
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);

      // Combine and shuffle the final 4 options
      const finalOptions = [...pickedCorrect, ...pickedIncorrect]
        .sort(() => 0.5 - Math.random())
        .map((o) => ({
          id: o.id,
          text: o.optionText,
        }));

      return {
        id: q.id,
        text: q.questionText,
        type: q.questionType,
        points: 1,
        options: finalOptions,
      };
    });

    const attempt = this.attemptRepository.create({
      quizId,
      userId,
      questionSnapshots: snapshots,
      score: 0,
      isPassed: false,
      startedAt: new Date(),
    });

    const saved = await this.attemptRepository.save(attempt);
    return this.attemptRepository.findOne({
      where: { id: saved.id },
      relations: ['quiz'],
    });
  }

  async submitAttempt(
    attemptId: number,
    userId: number,
    answers: SubmitAnswersPayload,
  ) {
    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId, userId },
      relations: ['quiz'],
    });

    if (!attempt) throw new NotFoundException('Không tìm thấy lượt làm bài');
    if (attempt.completedAt)
      throw new BadRequestException('BÀI KIỂM TRA ĐÃ ĐƯỢC NỘP TRƯỚC ĐÓ');

    const quiz = attempt.quiz;
    const submittedAt = new Date();
    if (this.isAttemptExpired(attempt, quiz, submittedAt)) {
      console.log(
        `[QuizzesService] Attempt ${attempt.id} submitted after time limit`,
      );
    }
    const snapshots = this.parseSnapshots(attempt.questionSnapshots);

    // Fetch correct options from DB to grade
    const questionIds = snapshots.map((s) => s.id);
    const questionsWithCorrect = await this.questionRepository.find({
      where: { id: In(questionIds) },
      relations: ['options'],
    });

    let correctCount = 0;
    const totalCount = snapshots.length;

    // The frontend sends { answers: { questionId: [optionId] } }
    const answersMap = this.parseAnswersMap(answers);

    snapshots.forEach((s) => {
      const question = questionsWithCorrect.find(
        (q) => Number(q.id) === Number(s.id),
      );
      if (!question) {
        console.log(
          `[QuizzesService] Question not found for snapshot id: ${s.id}`,
        );
        return;
      }

      const studentAnswer = answersMap[s.id] || answersMap[String(s.id)];
      const correctOption = question.options.find((o) => o.isCorrect);

      console.log(
        `[grading] Q:${s.id} Student:${JSON.stringify(studentAnswer)} Correct:${correctOption?.id}`,
      );

      if (correctOption) {
        const correctId = Number(correctOption.id);
        if (Array.isArray(studentAnswer)) {
          if (studentAnswer.some((id) => Number(id) === correctId)) {
            correctCount++;
            console.log(`[grading] Correct via array`);
          }
        } else if (studentAnswer !== undefined && studentAnswer !== null) {
          if (Number(studentAnswer) === correctId) {
            correctCount++;
            console.log(`[grading] Correct via direct`);
          }
        }
      }
    });

    const scorePercent = (correctCount / totalCount) * 100;
    const isPassed = scorePercent >= quiz.passingScore;

    attempt.score = scorePercent;
    attempt.isPassed = isPassed;
    attempt.answers = answers;
    attempt.completedAt = submittedAt;

    const saved = await this.attemptRepository.save(attempt);

    // If final exam and passed, mark enrollment as completed?
    // Actually, enrollment completion might depend on more factors, but this is a key one.
    if (quiz.isFinal && isPassed) {
      await this.markCourseCompleted(quiz.courseId, userId);
    }

    // Send quiz notifications in the background
    void this.sendQuizNotifications(
      quiz,
      userId,
      scorePercent,
      isPassed,
      correctCount,
      totalCount,
    );

    return {
      ...saved,
      correctCount,
      totalCount,
      correctAnswers: questionsWithCorrect.reduce(
        (acc, q) => {
          const correctOpt = q.options.find((o) => o.isCorrect);
          if (correctOpt) acc[q.id] = correctOpt.id;
          return acc;
        },
        {} as Record<number, number>,
      ),
    };
  }

  async getAttemptDetail(attemptId: number, userId: number) {
    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId, userId },
      relations: ['quiz'],
    });

    if (!attempt) throw new NotFoundException('Không tìm thấy lượt làm bài');

    const snapshots = this.parseSnapshots(attempt.questionSnapshots);
    const questionIds = snapshots.map((s) => s.id);

    const questionsWithCorrect = await this.questionRepository.find({
      where: { id: In(questionIds) },
      relations: ['options'],
    });

    const correctAnswers = questionsWithCorrect.reduce(
      (acc, q) => {
        const correctOpt = q.options.find((o) => o.isCorrect);
        if (correctOpt) acc[q.id] = correctOpt.id;
        return acc;
      },
      {} as Record<number, number>,
    );

    return {
      ...attempt,
      correctAnswers,
    };
  }

  private async sendQuizNotifications(
    quiz: Quiz,
    userId: number,
    scorePercent: number,
    isPassed: boolean,
    correctCount: number,
    totalCount: number,
  ) {
    try {
      const quizTitle = quiz.title || 'Bài kiểm tra';

      if (isPassed) {
        await this.notificationsService.sendNotification(
          userId,
          NotificationType.QUIZ,
          'Chúc mừng! Vượt qua bài kiểm tra!',
          `Bạn đã đạt ${correctCount}/${totalCount} (điểm ${Math.round(scorePercent)}%) trong bài kiểm tra "${quizTitle}".${quiz.isFinal ? ' Bạn đã đủ điều kiện hoàn thành khóa học!' : ''}`,
          { quizId: quiz.id, score: scorePercent },
        );
      } else {
        await this.notificationsService.sendNotification(
          userId,
          NotificationType.QUIZ,
          'Kết quả bài kiểm tra',
          `Rất tiếc, bạn chỉ đạt ${correctCount}/${totalCount} (điểm ${Math.round(scorePercent)}%). Hãy ôn tập lại và thử lại nhé!`,
          { quizId: quiz.id, score: scorePercent },
        );
      }

      // If final exam passed, send course completion notification
      if (quiz.isFinal && isPassed) {
        const course = quiz.course;
        if (course) {
          await this.notificationsService.sendNotification(
            userId,
            NotificationType.ENROLLMENT,
            'Hoàn thành khóa học!',
            `Tuyệt vời! Bạn đã hoàn thành khóa học "${course.title}". Chứng chỉ của bạn đã sẵn sàng!`,
            { courseId: quiz.courseId },
          );
        }
      }
    } catch (e) {
      console.error('Failed to send quiz notification:', e);
    }
  }

  private async markCourseCompleted(courseId: number, userId: number) {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { course_id: courseId, student_id: userId },
    });
    if (enrollment && !enrollment.completed_at) {
      enrollment.completed_at = new Date();
      await this.enrollmentRepository.save(enrollment);
    }
  }

  // ── Instructor Quiz Methods ─────────────────────────────────────

  async createQuiz(data: Partial<Quiz>) {
    const quiz = this.quizRepository.create(data);
    return this.quizRepository.save(quiz);
  }

  async updateQuiz(id: number, data: Partial<Quiz>) {
    await this.quizRepository.update(id, data);
    return this.getQuiz(id);
  }

  async deleteQuiz(id: number) {
    return this.quizRepository.delete(id);
  }

  // ── Question Bank Methods ─────────────────────────────────────

  async getBanksByCourse(courseId: number) {
    return this.bankRepository.find({
      where: { courseId },
      order: { createdAt: 'DESC' },
    });
  }

  async createBank(data: Partial<QuestionBank>) {
    const bank = this.bankRepository.create(data);
    return this.bankRepository.save(bank);
  }

  async getBankDetail(id: number) {
    const bank = await this.bankRepository.findOne({
      where: { id },
      relations: ['questions', 'questions.options'],
    });
    if (!bank) throw new NotFoundException('Không tìm thấy ngân hàng câu hỏi');
    return bank;
  }

  async createQuestion(bankId: number, data: Partial<QuestionBankQuestion>) {
    const question = this.questionRepository.create({
      ...data,
      bankId,
    });
    return this.questionRepository.save(question);
  }

  async updateQuestion(id: number, data: Partial<QuestionBankQuestion>) {
    // Handling options update logic could be complex, for now assume simple update or separate endpoints
    await this.questionRepository.update(id, data);
    return this.questionRepository.findOne({
      where: { id },
      relations: ['options'],
    });
  }

  async deleteQuestion(id: number) {
    return this.questionRepository.delete(id);
  }
}
