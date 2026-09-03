import { IsEmail, IsNotEmpty, IsOptional, IsString, IsIn, Length, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OtpPurpose } from '../../common/enums/otp-purpose.enum';

export class VerifyOtpDto {
  @ApiProperty({ example: 'student@example.com' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  @MaxLength(254)
  email: string;

  @ApiProperty({ example: '123456', minLength: 6, maxLength: 6 })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'OTP code must be exactly 6 digits' })
  code: string;

  @ApiPropertyOptional({ enum: OtpPurpose, default: OtpPurpose.LOGIN })
  @IsOptional()
  @IsString()
  @IsIn(Object.values(OtpPurpose), {
    message: `purpose must be one of: ${Object.values(OtpPurpose).join(', ')}`,
  })
  purpose?: string = OtpPurpose.LOGIN;
}