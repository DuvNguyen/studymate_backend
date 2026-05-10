import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { Course } from '../entities/course.entity';
import { QuestionBank } from '../entities/question-bank.entity';
import {
  QuestionBankQuestion,
  QuestionType,
  QuestionDifficulty,
} from '../entities/question-bank-question.entity';
import { QuestionBankOption } from '../entities/question-bank-option.entity';
import { Exam } from '../entities/exam.entity';

export async function seedQuestionBanks(dataSource: DataSource) {
  const courseRepo = dataSource.getRepository(Course);
  const qbRepo = dataSource.getRepository(QuestionBank);
  const questionRepo = dataSource.getRepository(QuestionBankQuestion);
  const optionRepo = dataSource.getRepository(QuestionBankOption);
  const examRepo = dataSource.getRepository(Exam);

  // 1. Tìm khóa học Master Linux
  const course = await courseRepo.findOne({ where: { slug: 'master-linux-ubuntu' } });
  if (!course) {
    console.log('Không tìm thấy Course Master Linux, bỏ qua seed ngân hàng câu hỏi.');
    return;
  }

  const instructorId = course.instructorId; // 65

  // Xóa dữ liệu cũ của khóa học này để seed lại sạch sẽ
  await examRepo.delete({ courseId: course.id });
  await qbRepo.delete({ courseId: course.id });

  // 2. Tạo Ngân hàng câu hỏi
  const bank = qbRepo.create({
    courseId: course.id,
    title: 'Ngân hàng câu hỏi chuẩn: Linux Masterclass',
    description: 'Tập hợp 150 câu hỏi trắc nghiệm từ cơ bản đến nâng cao về Linux Ubuntu.',
  });
  const savedBank = await qbRepo.save(bank);

  // 3. Đọc và parse CSV
  const csvPath = path.join(process.cwd(), '../docs/ngan_hang_cau_hoi_linux_150.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`Không tìm thấy file CSV tại: ${csvPath}`);
    return;
  }

  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim() !== '');

  console.log(`Bắt đầu import ${lines.length - 1} câu hỏi từ CSV...`);

  function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  }

  // Lấy các Sections của khóa học để gán câu hỏi
  const sections = await dataSource.getRepository('sections').find({
    where: { courseId: course.id },
    order: { position: 'ASC' }
  });

  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 3) continue;

    const questionText = cols[1];
    const correctAnswer = cols[2];
    const wrongAnswers = cols.slice(3).filter(a => a !== '');

    // Phân bổ câu hỏi theo chương (giả định chia đôi)
    const sectionIndex = i <= 80 ? 0 : 1;
    const sectionId = sections[sectionIndex]?.id || null;

    // Ngẫu nhiên độ khó
    const difficulties = [QuestionDifficulty.EASY, QuestionDifficulty.MEDIUM, QuestionDifficulty.HARD];
    const difficulty = difficulties[Math.floor(Math.random() * difficulties.length)];

    // Tạo câu hỏi
    const question = questionRepo.create({
      bankId: savedBank.id,
      sectionId: sectionId, // Gán vào chương
      questionText: questionText,
      questionType: QuestionType.MCQ,
      difficulty: difficulty, // Gán độ khó
      isActive: true,
      addedById: instructorId,
    });
    const savedQuestion = await questionRepo.save(question);

    // Tạo options
    const options = [
      {
        questionId: savedQuestion.id,
        optionText: correctAnswer,
        isCorrect: true,
        sortOrder: 1,
      }
    ];

    wrongAnswers.forEach((text, index) => {
      options.push({
        questionId: savedQuestion.id,
        optionText: text,
        isCorrect: false,
        sortOrder: index + 2,
      });
    });

    await optionRepo.save(options);
  }

  // 4. Tạo một đề thi mẫu (Blueprint)
  const exam = examRepo.create({
    courseId: course.id,
    bankId: savedBank.id,
    title: 'Bài thi cuối khóa: Linux Master',
    description: 'Bài kiểm tra tổng quát toàn bộ kiến thức Linux Ubuntu với 50 câu hỏi ngẫu nhiên.',
    timeLimit: 60,
    createdById: instructorId,
  });
  await examRepo.save(exam);

  console.log(`Seed thành công ngân hàng câu hỏi và đề thi cho Course ID ${course.id}.`);
}
