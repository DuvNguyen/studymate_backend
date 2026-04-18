import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizzesService } from './quizzes.service';
import { QuizzesController } from './quizzes.controller';
import { Quiz } from '../../database/entities/quiz.entity';
import { QuizAttempt } from '../../database/entities/quiz-attempt.entity';
import { QuestionBankQuestion } from '../../database/entities/question-bank-question.entity';
import { QuestionBank } from '../../database/entities/question-bank.entity';
import { Enrollment } from '../../database/entities/enrollment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Quiz,
      QuizAttempt,
      QuestionBank,
      QuestionBankQuestion,
      Enrollment,
    ]),
  ],
  controllers: [QuizzesController],
  providers: [QuizzesService],
  exports: [QuizzesService],
})
export class QuizzesModule {}
