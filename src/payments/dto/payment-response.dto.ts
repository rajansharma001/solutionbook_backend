import { Exclude, Expose, Type } from 'class-transformer';
import { PaymentStatus, PaymentMethod, PaymentType } from '../../common/enums';

@Exclude()
export class PaymentResponseDto {
  @Expose() id: string;
  @Expose() amount: number;
  @Expose() instructorEarned: number;
  @Expose() status: PaymentStatus | string;
  @Expose() transactionId?: string;
  @Expose() paymentMethod: PaymentMethod | string;
  @Expose() receiptUrl: string;
  @Expose() remarks?: string;
  @Expose() userId: string;
  @Expose() paymentType: PaymentType | string;
  @Expose() courseId?: string;
  @Expose() studyMaterialId?: string;
  @Expose() verifiedById?: string;
  @Expose() verifiedAt?: Date;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
}
