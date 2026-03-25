import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyToken } from '@clerk/backend';
import { Request } from 'express';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Không tìm thấy token xác thực');
    }

    const token = authHeader.replace('Bearer ', '');

    try {
      // verifyToken() với jwtKey = PEM public key từ Clerk Dashboard
      // → verify chữ ký RSA256 hoàn toàn OFFLINE, không cần fetch JWKS qua network
      // → hacker không thể forge token dù biết userId
      const payload = await verifyToken(token, {
        jwtKey: this.config.get<string>('CLERK_JWT_KEY'),
        authorizedParties: [
          'http://localhost:3000',
          this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000',
        ],
      });

      (request as any).clerkUserId = payload.sub;
      return true;
    } catch (err: any) {
      console.error('[ClerkAuthGuard] verifyToken failed:', err?.message || err);
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
  }
}