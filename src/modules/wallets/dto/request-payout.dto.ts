import { IsNumber, IsString, Min, IsNotEmpty } from 'class-validator';

export class RequestPayoutDto {
  @IsNumber()
  @Min(500000, { message: 'Số tiền rút tối thiểu là 500,000đ' })
  amount: number;

  @IsString()
  @IsNotEmpty()
  bankAccountName: string;

  @IsString()
  @IsNotEmpty()
  bankAccountNumber: string;

  @IsString()
  @IsNotEmpty()
  bankName: string;
}
