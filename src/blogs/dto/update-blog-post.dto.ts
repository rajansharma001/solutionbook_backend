import { IsString, IsOptional, IsBoolean, IsArray, MaxLength, MinLength } from 'class-validator';
import { SanitizeRich, SanitizeShort } from '../../common/pipes/sanitize-html.pipe';

export class UpdateBlogPostDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @SanitizeShort()
  excerpt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50000)
  @SanitizeRich()
  content?: string;

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
