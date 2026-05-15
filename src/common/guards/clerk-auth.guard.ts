import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyToken } from '@clerk/backend';
import { AuthenticatedRequest } from '../types/authenticated-request.type';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Không tìm thấy token xác thực');
    }

    const token = authHeader.replace('Bearer ', '');
    const normalizeOrigin = (value: string) => value.trim().replace(/\/+$/, '');
    const frontendOrigins = (this.config.get<string>('FRONTEND_URL') || '')
      .split(',')
      .map((origin) => normalizeOrigin(origin))
      .filter(Boolean);
    const authorizedParties = [
      'http://localhost:3000',
      ...frontendOrigins,
    ];

    try {
      // verifyToken() với jwtKey = PEM public key từ Clerk Dashboard
      // → verify chữ ký RSA256 hoàn toàn OFFLINE, không cần fetch JWKS qua network
      // → hacker không thể forge token dù biết userId
      const payload = await verifyToken(token, {
        jwtKey: this.config.get<string>('CLERK_JWT_KEY'),
        authorizedParties,
      });

      request.clerkUserId = payload.sub;
      return true;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : null;
      console.error('[ClerkAuthGuard] verifyToken FAILED!');
      console.error('[ClerkAuthGuard] Error Name:', error?.name);
      console.error('[ClerkAuthGuard] Error Message:', error?.message);
      console.error(
        '[ClerkAuthGuard] Token prefix:',
        token ? token.substring(0, 10) + '...' : 'NONE',
      );
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
  }
}
