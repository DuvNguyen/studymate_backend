import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../database/entities/user.entity';

// Dùng trong controller để lấy user hiện tại
// Ví dụ: @Get('me') getMe(@CurrentUser() user: User) { ... }
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

// Lấy clerkUserId thô từ token (trước khi resolve user từ DB)
export const ClerkUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.clerkUserId;
  },
);