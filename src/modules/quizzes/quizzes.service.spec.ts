import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment } from '../../database/entities/enrollment.entity';
import { QuestionBank } from '../../database/entities/question-bank.entity';
import { QuestionBankQuestion } from '../../database/entities/question-bank-question.entity';
import { QuizAttempt } from '../../database/entities/quiz-attempt.entity';
import { Quiz } from '../../database/entities/quiz.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { QuizzesService } from './quizzes.service';

type RepositoryMock<T extends object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

const createRepositoryMock = <T extends object>(): RepositoryMock<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

describe('QuizzesService', () => {
  let service: QuizzesService;
  let quizRepository: RepositoryMock<Quiz>;
  let attemptRepository: RepositoryMock<QuizAttempt>;
  let questionRepository: RepositoryMock<QuestionBankQuestion>;
  let enrollmentRepository: RepositoryMock<Enrollment>;

  const finalQuiz = {
    id: 1,
    courseId: 100,
    bankId: 50,
    title: 'Final quiz',
    isFinal: true,
    isActive: true,
    passingScore: 80,
    timeLimit: 30,
    numQuestions: 1,
    numEasy: 0,
    numMedium: 0,
    numHard: 0,
    difficulty: null,
  } as Quiz;

  beforeEach(async () => {
    quizRepository = createRepositoryMock<Quiz>();
    attemptRepository = createRepositoryMock<QuizAttempt>();
    const bankRepository = createRepositoryMock<QuestionBank>();
    questionRepository = createRepositoryMock<QuestionBankQuestion>();
    enrollmentRepository = createRepositoryMock<Enrollment>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizzesService,
        { provide: getRepositoryToken(Quiz), useValue: quizRepository },
        {
          provide: getRepositoryToken(QuizAttempt),
          useValue: attemptRepository,
        },
        { provide: getRepositoryToken(QuestionBank), useValue: bankRepository },
        {
          provide: getRepositoryToken(QuestionBankQuestion),
          useValue: questionRepository,
        },
        {
          provide: getRepositoryToken(Enrollment),
          useValue: enrollmentRepository,
        },
        {
          provide: NotificationsService,
          useValue: { sendNotification: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<QuizzesService>(QuizzesService);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rejects final quiz start when enrollment is missing', async () => {
    quizRepository.findOne!.mockResolvedValue(finalQuiz);
    enrollmentRepository.findOne!.mockResolvedValue(null);

    await expect(service.startAttempt(finalQuiz.id, 7)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects final quiz start when course progress is below 80 percent', async () => {
    quizRepository.findOne!.mockResolvedValue(finalQuiz);
    enrollmentRepository.findOne!.mockResolvedValue({
      id: 11,
      progress_percent: 79,
    });

    await expect(service.startAttempt(finalQuiz.id, 7)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects final quiz start until all active chapter quizzes are passed', async () => {
    quizRepository.findOne!.mockResolvedValue(finalQuiz);
    enrollmentRepository.findOne!.mockResolvedValue({
      id: 11,
      progress_percent: 80,
    });
    quizRepository.find!.mockResolvedValue([{ id: 10 }, { id: 11 }]);
    attemptRepository.find!.mockResolvedValue([{ quizId: 10 }]);

    await expect(service.startAttempt(finalQuiz.id, 7)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('allows final quiz start when progress and chapter quizzes are complete', async () => {
    quizRepository.findOne!.mockResolvedValue(finalQuiz);
    enrollmentRepository.findOne!.mockResolvedValue({
      id: 11,
      progress_percent: 80,
    });
    quizRepository.find!.mockResolvedValue([{ id: 10 }, { id: 11 }]);
    attemptRepository.find!.mockResolvedValue([{ quizId: 10 }, { quizId: 11 }]);
    attemptRepository
      .findOne!.mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 99, quiz: finalQuiz });
    attemptRepository.count!.mockResolvedValue(1);
    questionRepository.find!.mockResolvedValue([
      {
        id: 1000,
        questionText: 'Question',
        questionType: 'MULTIPLE_CHOICE',
        options: [
          { id: 1, optionText: 'Correct', isCorrect: true },
          { id: 2, optionText: 'Wrong', isCorrect: false },
          { id: 3, optionText: 'Wrong', isCorrect: false },
          { id: 4, optionText: 'Wrong', isCorrect: false },
        ],
      },
    ]);
    attemptRepository.create!.mockImplementation(
      (data: unknown) => data as QuizAttempt,
    );
    attemptRepository.save!.mockResolvedValue({ id: 99 });

    await expect(service.startAttempt(finalQuiz.id, 7)).resolves.toEqual({
      id: 99,
      quiz: finalQuiz,
    });
    expect(attemptRepository.save).toHaveBeenCalled();
  });

  it('reuses an unsubmitted final attempt that is still within time limit', async () => {
    const activeAttempt = {
      id: 99,
      quizId: finalQuiz.id,
      userId: 7,
      quiz: finalQuiz,
      startedAt: new Date(),
      completedAt: null,
    };
    quizRepository.findOne!.mockResolvedValue(finalQuiz);
    enrollmentRepository.findOne!.mockResolvedValue({
      id: 11,
      progress_percent: 100,
    });
    quizRepository.find!.mockResolvedValue([]);
    attemptRepository.findOne!.mockResolvedValue(activeAttempt);

    await expect(service.startAttempt(finalQuiz.id, 7)).resolves.toBe(
      activeAttempt,
    );
    expect(attemptRepository.count).not.toHaveBeenCalled();
    expect(attemptRepository.save).not.toHaveBeenCalled();
  });

  it('counts only completed submissions for final quiz attempt cap', async () => {
    quizRepository.findOne!.mockResolvedValue(finalQuiz);
    enrollmentRepository.findOne!.mockResolvedValue({
      id: 11,
      progress_percent: 100,
    });
    quizRepository.find!.mockResolvedValue([]);
    attemptRepository.findOne!.mockResolvedValue(null);
    attemptRepository.count!.mockResolvedValue(2);

    await expect(service.startAttempt(finalQuiz.id, 7)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('grades and saves a submit after time limit instead of rejecting it', async () => {
    const startedAt = new Date(Date.now() - 31 * 60 * 1000);
    const attempt = {
      id: 500,
      quizId: finalQuiz.id,
      userId: 7,
      quiz: finalQuiz,
      startedAt,
      completedAt: null,
      questionSnapshots: [
        {
          id: 1000,
          text: 'Question',
          type: 'MULTIPLE_CHOICE',
          points: 1,
          options: [{ id: 1, text: 'Correct' }],
        },
      ],
    } as QuizAttempt;

    attemptRepository.findOne!.mockResolvedValue(attempt);
    questionRepository.find!.mockResolvedValue([
      {
        id: 1000,
        options: [{ id: 1, isCorrect: true }],
      },
    ]);
    attemptRepository.save!.mockImplementation((savedAttempt) =>
      Promise.resolve(savedAttempt),
    );
    enrollmentRepository.findOne!.mockResolvedValue({
      id: 11,
      completed_at: null,
    });

    const result = await service.submitAttempt(500, 7, {
      answers: { '1000': [1] },
    });

    expect(result.score).toBe(100);
    expect(result.isPassed).toBe(true);
    expect(result.completedAt).toBeInstanceOf(Date);
    expect(attemptRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        score: 100,
        isPassed: true,
        completedAt: expect.any(Date) as Date,
      }),
    );
  });
});
