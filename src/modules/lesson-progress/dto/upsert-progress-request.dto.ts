import { IsNotEmpty, IsNumber, IsBoolean, IsOptional } from 'class-validator';

export class UpsertProgressDto {
  @IsNotEmpty()
  @IsNumber()
  lessonId: number;

  @IsNotEmpty()
  @IsNumber()
  watchedDuration: number;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}
