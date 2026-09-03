import { IsString, IsNotEmpty, IsNumber, IsOptional, IsUUID, IsPositive, MaxLength, IsEnum } from 'class-validator';
import { PaymentMethod, PaymentType } from '../../common/enums';

export class CreatePaymentDto {
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @IsOptional()
  @IsUUID()
  studyMaterialId?: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  receiptUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  transactionId?: string;

  @IsOptional()
  @IsEnum(PaymentType)
  paymentType?: PaymentType;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;
}
