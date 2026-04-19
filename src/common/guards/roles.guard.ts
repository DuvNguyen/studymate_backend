import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsersService } from '../../modules/users/users.service';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const clerkUserId = request.clerkUserId;

    if (!clerkUserId) {
      return false;
    }

    const user = await this.usersService.findOneByClerkId(clerkUserId);

    if (!user) {
      throw new ForbiddenException(
        'Tài khoản không tồn tại, có thể đang đồng bộ webhooks.',
      );
    }

    request.user = user;

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    if (!requiredRoles.includes(user.role.roleName)) {
      throw new ForbiddenException(
        `Giới hạn quyền truy cập. Yêu cầu: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
