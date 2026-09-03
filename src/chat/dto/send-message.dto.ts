import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { SanitizeUserContent } from '../../common/pipes/sanitize-html.pipe';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  @SanitizeUserContent()
  content: string;
}
