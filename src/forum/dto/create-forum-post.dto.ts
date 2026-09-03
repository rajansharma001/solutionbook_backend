import { IsString, IsNotEmpty, IsOptional, MaxLength, MinLength } from 'class-validator';
import { SanitizeRich } from '../../common/pipes/sanitize-html.pipe';

export class CreateForumPostDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50000)
  @SanitizeRich()
  content: string;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsOptional()
  @IsString()
  courseId?: string;
}
