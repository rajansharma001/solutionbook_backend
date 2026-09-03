import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CaptchaDto {
  @ApiProperty({
    required: false,
    example: 'abc123',
    description: 'CAPTCHA challenge ID',
  })
  @IsOptional()
  @IsString()
  captchaId?: string;

  @ApiProperty({ required: false, example: '5', description: 'CAPTCHA answer' })
  @IsOptional()
  @IsString()
  captchaAnswer?: string;
}
