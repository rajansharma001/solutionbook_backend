import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../../settings/settings.service';

@Injectable()
export class AdminAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
  ) {}

  async getReports(year?: string, month?: string) {
    const wherePayments: any = { status: 'APPROVED' };
    const wherePayouts: any = {};
    const whereUsers: any = {};

    if (year) {
      const yr = parseInt(year);
      let startDate = new Date(yr, 0, 1);
      let endDate = new Date(yr + 1, 0, 1);

      if (month) {
        const mn = parseInt(month) - 1;
        startDate = new Date(yr, mn, 1);
        endDate = new Date(yr, mn + 1, 1);
      }

      wherePayments.createdAt = { gte: startDate, lt: endDate };
      wherePayouts.createdAt = { gte: startDate, lt: endDate };
      whereUsers.createdAt = { gte: startDate, lt: endDate };
    }

    const [payments, payouts, totalUsersCount] = await Promise.all([
      this.prisma.payment.findMany({
        where: wherePayments,
        include: { course: true, studyMaterial: true, user: true },
      }),
      this.prisma.payout.findMany({
        where: wherePayouts,
        include: { instructor: true },
      }),
      this.prisma.user.count({
        where: whereUsers,
      }),
    ]);

    const totalIncome = payments.reduce((acc, p) => acc + p.amount, 0);
    const courseIncome = payments.filter(p => p.paymentType === 'COURSE').reduce((acc, p) => acc + p.amount, 0);
    const resourceIncome = payments.filter(p => p.paymentType === 'RESOURCE').reduce((acc, p) => acc + p.amount, 0);

    const paidPayouts = payouts.filter(p => p.status === 'COMPLETED').reduce((acc, p) => acc + p.amount, 0);
    const pendingPayouts = payouts.filter(p => p.status === 'PENDING').reduce((acc, p) => acc + p.amount, 0);

    const totalInstructorEarned = payments.reduce((acc, p) => acc + p.instructorEarned, 0);
    const platformCommission = totalIncome - totalInstructorEarned;

    // Course Breakdown
    const courseSalesMap: Record<string, { id: string; title: string; category: string; salesCount: number; totalRevenue: number }> = {};
    payments.forEach(p => {
      if (p.paymentType === 'COURSE' && p.course) {
        const c = p.course;
        if (!courseSalesMap[c.id]) {
          courseSalesMap[c.id] = { id: c.id, title: c.title, category: c.category, salesCount: 0, totalRevenue: 0 };
        }
        courseSalesMap[c.id].salesCount += 1;
        courseSalesMap[c.id].totalRevenue += p.amount;
      }
    });
    const courseBreakdown = Object.values(courseSalesMap).sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Resource Breakdown
    const resourceSalesMap: Record<string, { id: string; title: string; salesCount: number; totalRevenue: number }> = {};
    payments.forEach(p => {
      if (p.paymentType === 'RESOURCE' && p.studyMaterial) {
        const r = p.studyMaterial;
        if (!resourceSalesMap[r.id]) {
          resourceSalesMap[r.id] = { id: r.id, title: r.title, salesCount: 0, totalRevenue: 0 };
        }
        resourceSalesMap[r.id].salesCount += 1;
        resourceSalesMap[r.id].totalRevenue += p.amount;
      }
    });
    const resourceBreakdown = Object.values(resourceSalesMap).sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Category Breakdown
    const categorySalesMap: Record<string, { category: string; salesCount: number; totalRevenue: number }> = {};
    payments.forEach(p => {
      if (p.paymentType === 'COURSE' && p.course) {
        const cat = p.course.category || 'General';
        if (!categorySalesMap[cat]) {
          categorySalesMap[cat] = { category: cat, salesCount: 0, totalRevenue: 0 };
        }
        categorySalesMap[cat].salesCount += 1;
        categorySalesMap[cat].totalRevenue += p.amount;
      }
    });
    const categoryBreakdown = Object.values(categorySalesMap).sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Monthly summary for charts
    const monthlySummary: Record<string, { month: string; income: number; users: number; payouts: number }> = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      monthlySummary[label] = { month: label, income: 0, users: 0, payouts: 0 };
    }

    payments.forEach(p => {
      const d = new Date(p.createdAt);
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      if (monthlySummary[label]) {
        monthlySummary[label].income += p.amount;
      }
    });

    payouts.forEach(p => {
      const d = new Date(p.createdAt);
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      if (monthlySummary[label]) {
        monthlySummary[label].payouts += p.amount;
      }
    });

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const users = await this.prisma.user.findMany({
      where: { createdAt: { gte: oneYearAgo } },
      select: { createdAt: true },
    });
    users.forEach(u => {
      const d = new Date(u.createdAt);
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      if (monthlySummary[label]) {
        monthlySummary[label].users += 1;
      }
    });

    return {
      financials: {
        totalIncome,
        courseIncome,
        resourceIncome,
        paidPayouts,
        pendingPayouts,
        totalInstructorEarned,
        platformCommission,
        totalUsersCount,
      },
      courseBreakdown,
      resourceBreakdown,
      categoryBreakdown,
      monthlySummary: Object.values(monthlySummary),
    };
  }

  async getAnalytics() {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const [topCourses, topStudents] = await Promise.all([
      this.prisma.course.findMany({
        take: 5,
        orderBy: { enrollmentCount: 'desc' },
        select: { id: true, title: true, enrollmentCount: true, price: true },
      }),
      this.prisma.studentProfile.findMany({
        take: 5,
        orderBy: { totalXP: 'desc' },
        select: {
          totalXP: true,
          user: { select: { name: true, email: true, profileImage: true } },
        },
      }),
    ]);

    const monthlyData: Record<
      string,
      { month: string; revenue: number; users: number; enrollments: number }
    > = {};

    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthStr] = { month: monthStr, revenue: 0, users: 0, enrollments: 0 };
    }

    const monthlyRevenue = await this.prisma.$queryRaw<
      Array<{ month: string; total: number }>
    >`
      SELECT to_char("createdAt", 'YYYY-MM') AS month, COALESCE(SUM(amount), 0) AS total
      FROM "Payment"
      WHERE status = 'APPROVED' AND "createdAt" >= ${oneYearAgo}
      GROUP BY month
    `;

    const monthlyUsers = await this.prisma.$queryRaw<
      Array<{ month: string; count: bigint }>
    >`
      SELECT to_char("createdAt", 'YYYY-MM') AS month, COUNT(*)::bigint AS count
      FROM "User"
      WHERE "createdAt" >= ${oneYearAgo}
      GROUP BY month
    `;

    const monthlyEnrollments = await this.prisma.$queryRaw<
      Array<{ month: string; count: bigint }>
    >`
      SELECT to_char("createdAt", 'YYYY-MM') AS month, COUNT(*)::bigint AS count
      FROM "Enrollment"
      WHERE "createdAt" >= ${oneYearAgo}
      GROUP BY month
    `;

    monthlyRevenue.forEach((r) => {
      if (monthlyData[r.month]) monthlyData[r.month].revenue = Number(r.total);
    });
    monthlyUsers.forEach((u) => {
      if (monthlyData[u.month]) monthlyData[u.month].users = Number(u.count);
    });
    monthlyEnrollments.forEach((e) => {
      if (monthlyData[e.month]) monthlyData[e.month].enrollments = Number(e.count);
    });

    return {
      monthlyChartData: Object.values(monthlyData),
      topCourses,
      topStudents,
    };
  }

  async getPlatformHeatmap() {
    const since = new Date();
    since.setDate(since.getDate() - 84);

    const progress = await this.prisma.userProgress.findMany({
      where: { updatedAt: { gte: since } },
      select: { updatedAt: true, userId: true },
    });

    const heatmap: Record<string, { count: number; uniqueUsers: Set<string> }> =
      {};

    progress.forEach((p) => {
      const date = p.updatedAt.toISOString().split('T')[0];
      if (!heatmap[date]) {
        heatmap[date] = { count: 0, uniqueUsers: new Set() };
      }
      heatmap[date].count += 1;
      heatmap[date].uniqueUsers.add(p.userId);
    });

    const totalDays = Object.keys(heatmap).length || 1;
    let totalDau = 0;

    const heatmapData = Object.entries(heatmap).map(([date, data]) => {
      totalDau += data.uniqueUsers.size;
      return {
        date,
        count: data.count,
        activeUsers: data.uniqueUsers.size,
      };
    });

    const avgDau = Math.round(totalDau / totalDays);

    return {
      heatmap: heatmapData,
      avgDau,
      totalInteractions: progress.length,
    };
  }
}