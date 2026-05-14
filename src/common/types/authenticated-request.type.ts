import { Request } from 'express';
import { User } from '../../database/entities/user.entity';

export interface AuthenticatedRequest extends Request {
  clerkUserId?: string;
  user?: User;
}
