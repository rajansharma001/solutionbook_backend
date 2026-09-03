import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaymentStatus } from '../../common/enums';

const VERIFICATION_STATUSES = [PaymentStatus.APPROVED, PaymentStatus.REJECTED] as const;

export class VerifyPaymentDto {
  @IsIn(VERIFICATION_STATUSES)
  status: typeof VERIFICATION_STATUSES[number];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string;
}
