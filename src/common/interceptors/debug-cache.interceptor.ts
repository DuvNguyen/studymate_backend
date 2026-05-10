import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class DebugCacheInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    console.log(`[Cache Debug] Request to ${request.url}`);
    
    return next.handle().pipe(
      tap(() => console.log(`[Cache Debug] Response served for ${request.url}`))
    );
  }
}
