import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

// Bắt tất cả lỗi và trả về dạng nhất quán:
// { success: false, statusCode: ..., message: '...' }
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    console.error('--- HỆ THỐNG GẶP LỖI ---');
    console.error(exception);
    if (exception instanceof Error && exception.stack) {
      console.error(exception.stack);
    }
    console.error('------------------------');
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = this.getExceptionMessage(exception);

    response.status(status).json({
      success: false,
      statusCode: status,
      message: Array.isArray(message) ? message[0] : message,
    });
  }

  private getExceptionMessage(exception: unknown): string | string[] {
    if (!(exception instanceof HttpException)) {
      return 'Lỗi hệ thống, vui lòng thử lại sau';
    }

    const response = exception.getResponse();
    if (typeof response === 'string') {
      return response;
    }
    if (response && typeof response === 'object' && 'message' in response) {
      const message = response.message;
      if (typeof message === 'string' || Array.isArray(message)) {
        return message;
      }
    }

    return exception.message;
  }
}
