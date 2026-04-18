import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Quiz } from '../../database/entities/quiz.entity';
import { QuizAttempt } from '../../database/entities/quiz-attempt.entity';
import { QuestionBankQuestion } from '../../database/entities/question-bank-question.entity';
import { QuestionBank } from '../../database/entities/question-bank.entity';
import { Enrollment } from '../../database/entities/enrollment.entity';

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
  ) {}

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
    const quiz = await this.getQuiz(quizId);

    // Check attempt limits
    const attempts = await this.getUserAttempts(quizId, userId);
    if (quiz.isFinal && attempts.length >= 2) {
      throw new BadRequestException('BẠN ĐÃ HẾT LƯỢT LÀM BÀI KIỂM TRA CUỐI KHÓA (TỐI ĐA 2 LẦN)');
    }

    // Pick random questions from bank
    const allQuestions = await this.questionRepository.find({
      where: { bankId: quiz.bankId, isActive: true },
      relations: ['options'],
    });

    if (allQuestions.length === 0) {
      throw new BadRequestException('NGÂN HÀNG CÂU HỎI TRỐNG, VUI LÒNG LIÊN HỆ GIẢNG VIÊN');
    }

    // Shuffle and pick
    const shuffled = allQuestions.sort(() => 0.5 - Math.random());
    const picked = shuffled.slice(0, Math.min(quiz.numQuestions, allQuestions.length));

    // Prepare snapshots (randomize options too)
    const snapshots = picked.map(q => {
      const options = q.options.sort(() => 0.5 - Math.random()).map(o => ({
        id: o.id,
        text: o.optionText,
      }));
      return {
        id: q.id,
        text: q.questionText,
        type: q.questionType,
        points: 1, // Default 1 point per question for now
        options,
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

    return this.attemptRepository.save(attempt);
  }

  async submitAttempt(attemptId: number, userId: number, answers: any) {
    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId, userId },
      relations: ['quiz'],
    });

    if (!attempt) throw new NotFoundException('Không tìm thấy lượt làm bài');
    if (attempt.completedAt) throw new BadRequestException('BÀI KIỂM TRA ĐÃ ĐƯỢC NỘP TRƯỚC ĐÓ');

    const quiz = attempt.quiz;
    const snapshots = attempt.questionSnapshots;
    
    // Fetch correct options from DB to grade
    const questionIds = snapshots.map((s: any) => s.id);
    const questionsWithCorrect = await this.questionRepository.find({
      where: { id: In(questionIds) },
      relations: ['options'],
    });

    let correctCount = 0;
    const totalCount = snapshots.length;

    snapshots.forEach((s: any) => {
      const question = questionsWithCorrect.find(q => q.id === s.id);
      if (!question) return;

      const studentAnswer = answers[s.id];
      const correctOption = question.options.find(o => o.isCorrect);

      if (correctOption && studentAnswer === correctOption.id) {
        correctCount++;
      }
    });

    const scorePercent = (correctCount / totalCount) * 100;
    const isPassed = scorePercent >= quiz.passingScore;

    attempt.score = scorePercent;
    attempt.isPassed = isPassed;
    attempt.answers = answers;
    attempt.completedAt = new Date();

    const saved = await this.attemptRepository.save(attempt);

    // If final exam and passed, mark enrollment as completed?
    // Actually, enrollment completion might depend on more factors, but this is a key one.
    if (quiz.isFinal && isPassed) {
       await this.markCourseCompleted(quiz.courseId, userId);
    }

    return {
      ...saved,
      correctCount,
      totalCount,
    };
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

  async createQuiz(data: any) {
    const quiz = this.quizRepository.create(data);
    return this.quizRepository.save(quiz);
  }

  async updateQuiz(id: number, data: any) {
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

  async createBank(data: any) {
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

  async createQuestion(bankId: number, data: any) {
    const question = this.questionRepository.create({
      ...data,
      bankId,
    });
    return this.questionRepository.save(question);
  }

  async updateQuestion(id: number, data: any) {
    // Handling options update logic could be complex, for now assume simple update or separate endpoints
    await this.questionRepository.update(id, data);
    return this.questionRepository.findOne({ where: { id }, relations: ['options'] });
  }

  async deleteQuestion(id: number) {
    return this.questionRepository.delete(id);
  }
}
