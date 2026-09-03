import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../../settings/settings.service';

@Injectable()
export class AdminPaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
  ) {}

  async getAllPayments(status?: string, page = 1, limit = 20) {
    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, email: true, profileImage: true },
          },
          course: { select: { id: true, title: true } },
          studyMaterial: { select: { id: true, title: true } },
          verifiedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async verifyPayment(
    adminId: string,
    paymentId: string,
    dto: { status: 'APPROVED' | 'REJECTED'; remarks?: string },
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: true, course: true, studyMaterial: true },
    });

    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== 'PENDING')
      throw new BadRequestException('This payment has already been processed');

    let instructorEarned = 0;
    if (dto.status === 'APPROVED') {
      const commissionSetting = await this.settingsService.getSetting(
        'PLATFORM_COMMISSION_PERCENTAGE',
      );
      const commission = commissionSetting?.value
        ? parseFloat(commissionSetting.value)
        : 20;
      instructorEarned = payment.amount * ((100 - commission) / 100);
    }

    const updatedPayment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: dto.status,
        instructorEarned,
        remarks: dto.remarks ?? null,
        verifiedById: adminId,
        verifiedAt: new Date(),
      },
    });

    if (dto.status === 'APPROVED') {
      if (payment.paymentType === 'COURSE' && payment.courseId) {
        const existing = await this.prisma.enrollment.findUnique({
          where: {
            studentId_courseId: {
              studentId: payment.userId,
              courseId: payment.courseId,
            },
          },
        });

        if (!existing) {
          await this.prisma.enrollment.create({
            data: {
              studentId: payment.userId,
              courseId: payment.courseId,
              amount: payment.amount,
            },
          });
        }
      } else if (payment.paymentType === 'RESOURCE' && payment.studyMaterialId) {
        const existingAccess = await this.prisma.resourceAccess.findUnique({
          where: {
            userId_studyMaterialId: {
              userId: payment.userId,
              studyMaterialId: payment.studyMaterialId,
            },
          },
        });

        if (!existingAccess) {
          await this.prisma.resourceAccess.create({
            data: {
              userId: payment.userId,
              studyMaterialId: payment.studyMaterialId,
              amountPaid: payment.amount,
            },
          });
        }
      }
    }

    return updatedPayment;
  }

  async deletePayment(id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Payment not found');
    return this.prisma.payment.delete({ where: { id } });
  }
}