import { IsNumber, IsString, IsNotEmpty } from 'class-validator';

export class CreateRefundRequestDto {
  @IsNumber()
  @IsNotEmpty()
  enrollmentId: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsNotEmpty()
  bankName: string;

  @IsString()
  @IsNotEmpty()
  bankAccountNumber: string;

  @IsString()
  @IsNotEmpty()
  bankAccountName: string;
}
