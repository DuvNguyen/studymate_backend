import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface BaseResponseShape {
  data?: unknown;
  meta?: unknown;
  message?: string;
}

// Mọi response đều có dạng:
// { success: true, data: ..., message: '...' }
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<{ success: true; data: unknown; message: string }> {
    return next.handle().pipe(
      map((value: unknown) => {
        const data =
          value !== null && typeof value === 'object'
            ? (value as BaseResponseShape)
            : undefined;

        // Nếu data là đối tượng có cả 'data' và 'meta' (pagination), hoặc không có 'data' trường lẻ,
        // thì giữ nguyên cả object. Nếu chỉ có trường 'data', thì unwrap.
        const responseData =
          data?.data !== undefined && !data?.meta ? data.data : value;

        return {
          success: true,
          data: responseData,
          message: data?.message ?? 'Thành công',
        };
      }),
    );
  }
}
