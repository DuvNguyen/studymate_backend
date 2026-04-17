import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateDiscussionDto {
  @IsString()
  @IsNotEmpty()
  content: string;
}
