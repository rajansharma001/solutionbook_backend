import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly settings: SettingsService,
  ) {}

  async getUserPayments(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = { userId };
    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        include: {
          course: { select: { id: true, title: true, thumbnail: true } },
          studyMaterial: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createPayment(
    userId: string,
    dto: {
      courseId?: string;
      studyMaterialId?: string;
      amount: number;
      paymentMethod: string;
      receiptUrl: string;
      transactionId?: string;
      idempotencyKey?: string;
    },
  ) {
    // Check for duplicate payment using idempotency key
    if (dto.idempotencyKey) {
      const existingByKey = await this.prisma.payment.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existingByKey) {
        throw new BadRequestException(
          'A payment with this idempotency key already exists.',
        );
      }
    }

    // Check if payment already pending for this user+course
    const whereClause: any = { userId, status: 'PENDING' };
    if (dto.courseId) whereClause.courseId = dto.courseId;
    if (dto.studyMaterialId) whereClause.studyMaterialId = dto.studyMaterialId;

    const existing = await this.prisma.payment.findFirst({
      where: whereClause,
    });
    if (existing) {
      throw new BadRequestException(
        'A payment request for this item is already pending admin review.',
      );
    }

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        courseId: dto.courseId,
        studyMaterialId: dto.studyMaterialId,
        paymentType: dto.courseId ? 'COURSE' : 'RESOURCE',
        amount: dto.amount,
        paymentMethod: dto.paymentMethod,
        receiptUrl: dto.receiptUrl,
        transactionId: dto.transactionId ?? null,
        status: 'PENDING',
        idempotencyKey: dto.idempotencyKey ?? null,
      },
    });

    // Notify admin(s) via notifications
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
    });
    for (const admin of admins) {
      await this.notifications.createNotification(
        admin.id,
        'New Payment Submission',
        `A student has submitted a payment receipt for review. Payment ID: ${payment.id}`,
        'PAYMENT',
        '/admin/payments',
      );
    }

    return payment;
  }

  async getPaymentById(id: string, userId?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true } },
        studyMaterial: { select: { id: true, title: true } },
      },
    });

    if (!payment) throw new NotFoundException('Payment not found');

    // Only allow the payment owner or an admin to view
    if (userId && payment.userId !== userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (user?.role !== 'ADMIN') {
        throw new NotFoundException('Payment not found');
      }
    }

    return payment;
  }

  async getAllPayments(status?: string, page = 1, limit = 20) {
    const where: Prisma.PaymentWhereInput = {};
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
          course: { select: { id: true, title: true, thumbnail: true } },
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
      const commissionSetting = await this.settings.getSetting(
        'PLATFORM_COMMISSION_PERCENTAGE',
      );
      const commission = commissionSetting?.value
        ? parseFloat(commissionSetting.value)
        : 20; // default 20% platform fee
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
        // Auto-enroll the student
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

        // Notify the student
        await this.notifications.createNotification(
          payment.userId,
          '🎉 Payment Approved!',
          `Your payment for "${payment.course?.title}" has been approved. You can now start learning!`,
          'PAYMENT',
          `/courses/${payment.courseId}/learn`,
        );
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

        await this.notifications.createNotification(
          payment.userId,
          '🎉 Payment Approved!',
          `Your payment for "${payment.studyMaterial?.title}" has been approved. You can now download it!`,
          'PAYMENT',
          `/notes`,
        );
      }
    } else {
      // Rejection notification
      const itemName = payment.paymentType === 'COURSE' ? payment.course?.title : payment.studyMaterial?.title;
      await this.notifications.createNotification(
        payment.userId,
        '❌ Payment Rejected',
        `Your payment for "${itemName}" was rejected. ${dto.remarks ? `Reason: ${dto.remarks}` : 'Please contact support.'}`,
        'PAYMENT',
        '/student/dashboard/payments',
      );
    }

    return updatedPayment;
  }

  async deletePayment(id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Payment not found');
    return this.prisma.payment.delete({ where: { id } });
  }
}
