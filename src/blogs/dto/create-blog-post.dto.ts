import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray, MaxLength, MinLength } from 'class-validator';
import { SanitizeRich, SanitizeShort } from '../../common/pipes/sanitize-html.pipe';

export class CreateBlogPostDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @SanitizeShort()
  excerpt?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50000)
  @SanitizeRich()
  content: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  thumbnail?: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
