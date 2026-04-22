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
  catch(exception: any, host: ArgumentsHost) {
    console.error('--- HỆ THỐNG GẶP LỖI ---');
    console.error(exception);
    if (exception?.stack) console.error(exception.stack);
    console.error('------------------------');
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? (exception.getResponse() as any)?.message || exception.message
        : 'Lỗi hệ thống, vui lòng thử lại sau';

    response.status(status).json({
      success: false,
      statusCode: status,
      message: Array.isArray(message) ? message[0] : message,
    });
  }
}
