import { IsEnum, IsString, IsOptional } from 'class-validator';
import { PayoutStatus } from '../../../database/entities/payout.entity';

export class ProcessPayoutDto {
  @IsEnum([PayoutStatus.COMPLETED, PayoutStatus.REJECTED])
  status: PayoutStatus;

  @IsString()
  @IsOptional()
  adminNote?: string;
}
