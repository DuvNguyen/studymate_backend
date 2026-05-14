import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest } from '../types/authenticated-request.type';

// Dùng trong controller để lấy user hiện tại
// Ví dụ: @Get('me') getMe(@CurrentUser() user: User) { ... }
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext): unknown => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);

// Lấy clerkUserId thô từ token (trước khi resolve user từ DB)
export const ClerkUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.clerkUserId;
  },
);
