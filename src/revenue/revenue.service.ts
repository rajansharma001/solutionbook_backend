import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Payment, Payout, User, InstructorProfile } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class RevenueService {
  private readonly logger = new Logger(RevenueService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService
  ) {}

  async getTeacherStats(instructorId: string) {
    // Get all approved payments for courses taught by this instructor
    const payments = await this.prisma.payment.findMany({
      where: {
        status: 'APPROVED',
        course: { teacherId: instructorId },
      },
    });

    let totalEarnings = 0;
    let totalSales = 0;

    payments.forEach((payment: Payment) => {
      totalSales += payment.amount || 0;
      totalEarnings += payment.instructorEarned || 0;
    });

    // Get payouts to calculate available balance
    const payouts = await this.prisma.payout.findMany({
      where: { instructorId },
    });

    const totalPaidOut = payouts
      .filter((p: Payout) => p.status === 'COMPLETED')
      .reduce((sum: number, p: Payout) => sum + p.amount, 0);

    const pendingPayouts = payouts
      .filter((p: Payout) => p.status === 'PENDING')
      .reduce((sum: number, p: Payout) => sum + p.amount, 0);

    const availableBalance = totalEarnings - totalPaidOut - pendingPayouts;

    return {
      totalSales,
      totalEarnings,
      totalPaidOut,
      pendingPayouts,
      availableBalance,
      payouts,
    };
  }

  async requestPayout(instructorId: string, amount: number) {
    const stats = await this.getTeacherStats(instructorId);

    if (amount <= 0) {
      throw new BadRequestException('Invalid payout amount');
    }

    if (amount > stats.availableBalance) {
      throw new BadRequestException('Insufficient balance');
    }

    const payout = await this.prisma.payout.create({
      data: {
        instructorId,
        amount,
        status: 'PENDING',
      },
    });

    // Notify all admins
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN' }
    });
    const teacher = await this.prisma.user.findUnique({
      where: { id: instructorId }
    });

    for (const admin of admins) {
      await this.notifications.createNotification(
        admin.id,
        'Payout Request',
        `${teacher?.name || teacher?.email || 'A teacher'} requested a payout of $${amount}`,
        'PAYOUT',
        '/admin/dashboard/finance'
      );
    }

    return payout;
  }

  async setRevenueShare(adminId: string, instructorId: string, share: number) {
    if (share < 0 || share > 100) {
      throw new BadRequestException('Share must be between 0 and 100');
    }

    // Upsert to ensure profile exists
    return this.prisma.instructorProfile.upsert({
      where: { userId: instructorId },
      update: { revenueShare: share },
      create: {
        userId: instructorId,
        revenueShare: share,
      },
    });
  }

  async updatePayoutStatus(adminId: string, payoutId: string, status: string) {
    return this.prisma.payout.update({
      where: { id: payoutId },
      data: { status },
    });
  }

  async getAdminInstructors() {
    const instructors = await this.prisma.user.findMany({
      where: { role: 'TEACHER' },
      include: {
        instructorProfile: true,
        payouts: true,
        _count: {
          select: { coursesTaught: true },
        },
      },
    });

    // We'll calculate earnings dynamically for each
    return Promise.all(
      instructors.map(
        async (
          inst: User & {
            instructorProfile: InstructorProfile | null;
            payouts: Payout[];
            _count: { coursesTaught: number };
          },
        ) => {
          const stats = await this.getTeacherStats(inst.id);
          return {
            id: inst.id,
            name: inst.name,
            email: inst.email,
            revenueShare: inst.instructorProfile?.revenueShare || 70,
            totalSales: stats.totalSales,
            totalEarnings: stats.totalEarnings,
            totalPaidOut: stats.totalPaidOut,
            pendingPayouts: stats.pendingPayouts,
            availableBalance: stats.availableBalance,
            coursesCount: inst._count.coursesTaught,
            payouts: inst.payouts,
          };
        },
      ),
    );
  }
}
