import { IsEnum, IsString, IsOptional } from 'class-validator';
import { RefundStatus } from '../../../database/entities/refund-request.entity';

export class ProcessRefundDto {
  @IsEnum(RefundStatus)
  status: RefundStatus;

  @IsString()
  @IsOptional()
  adminNote?: string;
}
