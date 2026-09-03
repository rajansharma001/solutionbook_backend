import { IsEmail, IsNotEmpty, IsOptional, IsString, IsIn, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OtpPurpose } from '../../common/enums/otp-purpose.enum';

export class RequestOtpDto {
  @ApiProperty({ example: 'student@example.com' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  @MaxLength(254)
  email: string;

  @ApiPropertyOptional({ enum: OtpPurpose, default: OtpPurpose.LOGIN })
  @IsOptional()
  @IsString()
  @IsIn(Object.values(OtpPurpose), {
    message: `purpose must be one of: ${Object.values(OtpPurpose).join(', ')}`,
  })
  purpose?: string = OtpPurpose.LOGIN;
}