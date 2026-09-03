import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../prisma/prisma.service';
import { GetDashboardStatsQuery } from './get-dashboard-stats.query';

@QueryHandler(GetDashboardStatsQuery)
export class GetDashboardStatsHandler implements IQueryHandler<GetDashboardStatsQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetDashboardStatsQuery) {
    const timeframe = query.timeframe ?? 'weekly';

    const [totalUsers, totalCourses, totalEnrollments, pendingCourses] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.course.count(),
        this.prisma.enrollment.count(),
        this.prisma.course.count({
          where: { status: 'DRAFT', adminVerified: false },
        }),
      ]);

    const revenueAgg = await this.prisma.payment.aggregate({
      where: { status: 'APPROVED' },
      _sum: { amount: true },
    });
    const totalRevenue = revenueAgg._sum.amount ?? 0;

    const recentUsers = await this.prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, role: true, createdAt: true, profileData: true },
    });

    const recentCourses = await this.prisma.course.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, status: true, adminVerified: true, createdAt: true,
        teacher: { select: { profileData: true } },
      },
    });

    const chartData = await this.getTrendData(timeframe);
    const revenueChange = await this.getRevenueGrowth(timeframe);

    return { totalUsers, totalCourses, totalEnrollments, pendingCourses, totalRevenue, recentUsers, recentCourses, chartData, revenueChange };
  }

  private async getRevenueGrowth(timeframe: string) {
    let daysCount = 7;
    if (timeframe === 'daily') daysCount = 7;
    else if (timeframe === 'weekly') daysCount = 42;
    else if (timeframe === 'monthly') daysCount = 180;
    else if (timeframe === 'yearly') daysCount = 365;

    const now = new Date();
    const currentStart = new Date(); currentStart.setDate(now.getDate() - daysCount);
    const previousStart = new Date(); previousStart.setDate(now.getDate() - 2 * daysCount);

    const [currentSum, previousSum] = await Promise.all([
      this.prisma.payment.aggregate({ where: { status: 'APPROVED', createdAt: { gte: currentStart, lte: now } }, _sum: { amount: true } }),
      this.prisma.payment.aggregate({ where: { status: 'APPROVED', createdAt: { gte: previousStart, lt: currentStart } }, _sum: { amount: true } }),
    ]);

    const current = currentSum._sum.amount ?? 0;
    const previous = previousSum._sum.amount ?? 0;
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100 * 10) / 10;
  }

  private async getTrendData(timeframe: string) {
    const registrationTrend: { labels: string[]; values: number[] } = { labels: [], values: [] };
    const revenueTrend: { labels: string[]; values: number[] } = { labels: [], values: [] };
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    let intervals: Date[] = [];
    let labels: string[] = [];

    if (timeframe === 'daily') {
      for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0); intervals.push(d); labels.push(weekdays[d.getDay()]); }
    } else if (timeframe === 'weekly') {
      for (let i = 5; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i * 7); d.setHours(0, 0, 0, 0); intervals.push(d); labels.push(`Wk ${6 - i}`); }
    } else if (timeframe === 'monthly' || timeframe === 'yearly') {
      const count = timeframe === 'monthly' ? 6 : 12;
      for (let i = count - 1; i >= 0; i--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); d.setHours(0, 0, 0, 0); intervals.push(d); labels.push(monthNames[d.getMonth()]); }
    }

    for (let i = 0; i < intervals.length; i++) {
      const start = intervals[i];
      const end = i < intervals.length - 1 ? intervals[i + 1] : new Date();
      const [regCount, revSum] = await Promise.all([
        this.prisma.user.count({ where: { createdAt: { gte: start, lt: end } } }),
        this.prisma.payment.aggregate({ where: { status: 'APPROVED', createdAt: { gte: start, lt: end } }, _sum: { amount: true } }),
      ]);
      registrationTrend.values.push(regCount);
      revenueTrend.values.push(revSum._sum.amount ?? 0);
    }
    registrationTrend.labels = labels;
    revenueTrend.labels = labels;

    return { registrationTrend, revenueTrend };
  }
}
