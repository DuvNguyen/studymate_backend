import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// Mọi response đều có dạng:
// { success: true, data: ..., message: '...' }
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // Nếu data là đối tượng có cả 'data' và 'meta' (pagination), hoặc không có 'data' trường lẻ,
        // thì giữ nguyên cả object. Nếu chỉ có trường 'data', thì unwrap.
        const responseData = (data?.data && !data?.meta) ? data.data : data;
        
        return {
          success: true,
          data: responseData,
          message: data?.message ?? 'Thành công',
        };
      }),
    );
  }
}