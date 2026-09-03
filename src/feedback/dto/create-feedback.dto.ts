import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { SanitizeUserContent } from '../../common/pipes/sanitize-html.pipe';

export class CreateFeedbackDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(5000)
  @SanitizeUserContent()
  message: string;

  @IsOptional()
  @IsString()
  page?: string;
}
