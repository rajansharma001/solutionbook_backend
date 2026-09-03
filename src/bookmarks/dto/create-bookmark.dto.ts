import { IsUUID, IsNotEmpty, IsNumber, IsOptional, IsString, Min, MaxLength } from 'class-validator';

export class CreateBookmarkDto {
  @IsUUID()
  @IsNotEmpty()
  lessonId: string;

  @IsNumber()
  @Min(0)
  timestamp: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
