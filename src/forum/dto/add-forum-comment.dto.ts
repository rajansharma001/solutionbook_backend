import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { SanitizeUserContent } from '../../common/pipes/sanitize-html.pipe';

export class AddForumCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  @SanitizeUserContent()
  content: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}
