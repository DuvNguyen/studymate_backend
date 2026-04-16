import { DataSource } from 'typeorm';
import { Course } from '../entities/course.entity';
import { QuestionBank } from '../entities/question-bank.entity';
import { QuestionBankQuestion, QuestionType, QuestionDifficulty } from '../entities/question-bank-question.entity';
import { QuestionBankOption } from '../entities/question-bank-option.entity';
import { Exam } from '../entities/exam.entity';

export async function seedQuestionBanks(dataSource: DataSource) {
  const courseRepo = dataSource.getRepository(Course);
  const qbRepo = dataSource.getRepository(QuestionBank);
  const questionRepo = dataSource.getRepository(QuestionBankQuestion);
  const optionRepo = dataSource.getRepository(QuestionBankOption);
  const examRepo = dataSource.getRepository(Exam);

  // Lấy course id = 1
  const course = await courseRepo.findOne({ where: { id: 1 } });
  if (!course) {
    console.log('Không tìm thấy Course ID 1, bỏ qua seed ngân hàng câu hỏi.');
    return;
  }

  // Chuyển instructor_id thành 62 theo yêu cầu
  course.instructorId = 62;
  await courseRepo.save(course);
  console.log('Đã chuyển Instructor của Course ID 1 thành 62.');

  // Xóa dữ liệu cũ nếu chạy lại (cascade tự lo liệu hoặc manually clean up)
  await examRepo.delete({ courseId: 1 });
  await qbRepo.delete({ courseId: 1 });

  // 1. Tạo Ngân hàng câu hỏi
  const bank = qbRepo.create({
    courseId: 1,
    title: 'Ngân hàng đề thi Web Cơ Bản',
    description: 'Tập hợp các câu hỏi trắc nghiệm Web và React cho khóa học mẫu',
  });
  const savedBank = await qbRepo.save(bank);

  // 2. Tạo câu hỏi 1
  const q1 = questionRepo.create({
    bankId: savedBank.id,
    questionText: 'Thuộc tính nào trong CSS được dùng để thay đổi màu chữ?',
    questionType: QuestionType.MCQ,
    difficulty: QuestionDifficulty.EASY,
    isActive: true,
    addedById: 62,
  });
  const savedQ1 = await questionRepo.save(q1);

  await optionRepo.save([
    { questionId: savedQ1.id, optionText: 'font-color', isCorrect: false, sortOrder: 1 },
    { questionId: savedQ1.id, optionText: 'text-color', isCorrect: false, sortOrder: 2 },
    { questionId: savedQ1.id, optionText: 'color', isCorrect: true, sortOrder: 3 },
    { questionId: savedQ1.id, optionText: 'fgcolor', isCorrect: false, sortOrder: 4 },
  ]);

  // 2. Tạo câu hỏi 2
  const q2 = questionRepo.create({
    bankId: savedBank.id,
    questionText: 'React hook nào được dùng để quản lý state trong functional component?',
    questionType: QuestionType.MCQ,
    difficulty: QuestionDifficulty.MEDIUM,
    isActive: true,
    addedById: 62,
  });
  const savedQ2 = await questionRepo.save(q2);

  await optionRepo.save([
    { questionId: savedQ2.id, optionText: 'useEffect', isCorrect: false, sortOrder: 1 },
    { questionId: savedQ2.id, optionText: 'useState', isCorrect: true, sortOrder: 2 },
    { questionId: savedQ2.id, optionText: 'useContext', isCorrect: false, sortOrder: 3 },
    { questionId: savedQ2.id, optionText: 'useReducer', isCorrect: false, sortOrder: 4 },
  ]);

  // 3. Tạo một đề thi mẫu (Blueprint)
  const exam = examRepo.create({
    courseId: 1,
    bankId: savedBank.id,
    title: 'Bài kiểm tra cuối khóa 1',
    description: 'Kiểm tra kiến thức tổng hợp sau khi hoàn thành khóa học',
    timeLimit: 15,
    createdById: 62,
  });
  await examRepo.save(exam);

  console.log('Seed ngân hàng câu hỏi, câu hỏi và đề thi thành công.');
}
