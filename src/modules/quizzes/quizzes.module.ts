import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizzesService } from './quizzes.service';
import { QuizzesController } from './quizzes.controller';
import { Quiz } from '../../database/entities/quiz.entity';
import { QuizAttempt } from '../../database/entities/quiz-attempt.entity';
import { QuestionBankQuestion } from '../../database/entities/question-bank-question.entity';
import { QuestionBankOption } from '../../database/entities/question-bank-option.entity';
import { QuestionBank } from '../../database/entities/question-bank.entity';
import { Enrollment } from '../../database/entities/enrollment.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Quiz,
      QuizAttempt,
      QuestionBank,
      QuestionBankQuestion,
      QuestionBankOption,
      Enrollment,
    ]),
  ],
  controllers: [QuizzesController],
  providers: [QuizzesService],
  exports: [QuizzesService],
})
export class QuizzesModule {}
