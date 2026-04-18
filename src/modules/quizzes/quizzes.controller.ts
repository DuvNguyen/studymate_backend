import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { QuizzesService } from './quizzes.service';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';

@Controller()
@UseGuards(ClerkAuthGuard, RolesGuard)
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  // ── Student Endpoints ──────────────────────────────────────────

  @Get('quizzes/course/:courseId')
  async getCourseQuizzes(@Param('courseId', ParseIntPipe) courseId: number) {
    return this.quizzesService.getQuizzesByCourse(courseId);
  }

  @Get('quizzes/:id')
  async getQuizDetail(@Param('id', ParseIntPipe) id: number) {
    return this.quizzesService.getQuiz(id);
  }

  @Get('quizzes/:id/attempts')
  async getMyAttempts(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.quizzesService.getUserAttempts(id, user.id);
  }

  @Post('quizzes/:id/start')
  async startQuiz(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.quizzesService.startAttempt(id, user.id);
  }

  @Post('quizzes/attempts/:attemptId/submit')
  async submitQuiz(
    @CurrentUser() user: User,
    @Param('attemptId', ParseIntPipe) attemptId: number,
    @Body() answers: any,
  ) {
    return this.quizzesService.submitAttempt(attemptId, user.id, answers);
  }

  // ── Instructor Endpoints ─────────────────────────────────────

  @Post('instructor/quizzes')
  @Roles('INSTRUCTOR', 'ADMIN')
  async createQuiz(@Body() data: any) {
    return this.quizzesService.createQuiz(data);
  }

  @Put('instructor/quizzes/:id')
  @Roles('INSTRUCTOR', 'ADMIN')
  async updateQuiz(@Param('id', ParseIntPipe) id: number, @Body() data: any) {
    return this.quizzesService.updateQuiz(id, data);
  }

  @Delete('instructor/quizzes/:id')
  @Roles('INSTRUCTOR', 'ADMIN')
  async deleteQuiz(@Param('id', ParseIntPipe) id: number) {
    return this.quizzesService.deleteQuiz(id);
  }

  // ── Question Bank Endpoints ─────────────────────────────────

  @Get('instructor/courses/:courseId/question-banks')
  @Roles('INSTRUCTOR', 'ADMIN')
  async getCourseBanks(@Param('courseId', ParseIntPipe) courseId: number) {
    return this.quizzesService.getBanksByCourse(courseId);
  }

  @Post('instructor/question-banks')
  @Roles('INSTRUCTOR', 'ADMIN')
  async createBank(@Body() data: any) {
    return this.quizzesService.createBank(data);
  }

  @Get('instructor/question-banks/:id')
  @Roles('INSTRUCTOR', 'ADMIN')
  async getBankDetail(@Param('id', ParseIntPipe) id: number) {
    return this.quizzesService.getBankDetail(id);
  }

  @Post('instructor/question-banks/:id/questions')
  @Roles('INSTRUCTOR', 'ADMIN')
  async addQuestion(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: any,
  ) {
    return this.quizzesService.createQuestion(id, data);
  }

  @Put('instructor/questions/:id')
  @Roles('INSTRUCTOR', 'ADMIN')
  async updateQuestion(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: any,
  ) {
    return this.quizzesService.updateQuestion(id, data);
  }

  @Delete('instructor/questions/:id')
  @Roles('INSTRUCTOR', 'ADMIN')
  async deleteQuestion(@Param('id', ParseIntPipe) id: number) {
    return this.quizzesService.deleteQuestion(id);
  }
}
