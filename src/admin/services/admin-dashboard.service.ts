import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../../settings/settings.service';
import { AdminCacheService } from './admin-cache.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AdminDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
    private readonly adminCache: AdminCacheService,
  ) {}

  async getDashboardStats(timeframe: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'weekly') {
    const cacheKey = `dashboard:stats:${timeframe ?? 'weekly'}`;
    const cached = await this.adminCache.get<Record<string, unknown>>(cacheKey);
    if (cached) return cached;

    const result = await this.computeDashboardStats(timeframe);

    await this.adminCache.set(cacheKey, result, 60);
    return result;
  }

  private async computeDashboardStats(timeframe: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'weekly') {
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
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        profileData: true,
      },
    });

    const recentCourses = await this.prisma.course.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        adminVerified: true,
        createdAt: true,
        teacher: { select: { profileData: true } },
      },
    });

    const chartData = await this.getTrendData(timeframe);
    const revenueChange = await this.getRevenueGrowth(timeframe);

    return {
      totalUsers,
      totalCourses,
      totalEnrollments,
      pendingCourses,
      totalRevenue,
      recentUsers,
      recentCourses,
      chartData,
      revenueChange,
    };
  }

  async getRevenueGrowth(timeframe: 'daily' | 'weekly' | 'monthly' | 'yearly') {
    let daysCount = 7;
    if (timeframe === 'daily') daysCount = 7;
    else if (timeframe === 'weekly') daysCount = 42;
    else if (timeframe === 'monthly') daysCount = 180;
    else if (timeframe === 'yearly') daysCount = 365;

    const now = new Date();
    const currentStart = new Date();
    currentStart.setDate(now.getDate() - daysCount);
    
    const previousStart = new Date();
    previousStart.setDate(now.getDate() - 2 * daysCount);

    const [currentSum, previousSum] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { status: 'APPROVED', createdAt: { gte: currentStart, lte: now } },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { status: 'APPROVED', createdAt: { gte: previousStart, lt: currentStart } },
        _sum: { amount: true },
      }),
    ]);

    const current = currentSum._sum.amount ?? 0;
    const previous = previousSum._sum.amount ?? 0;

    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return Math.round(((current - previous) / previous) * 100 * 10) / 10;
  }

  async getTrendData(timeframe: 'daily' | 'weekly' | 'monthly' | 'yearly') {
    const registrationTrend: { labels: string[]; values: number[] } = { labels: [], values: [] };
    const revenueTrend: { labels: string[]; values: number[] } = { labels: [], values: [] };

    if (timeframe === 'daily') {
      const days = [];
      const labels = [];
      const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        days.push(d);
        labels.push(weekdays[d.getDay()]);
      }

      const regValues = [];
      const revValues = [];

      for (const d of days) {
        const nextDay = new Date(d);
        nextDay.setDate(nextDay.getDate() + 1);

        const [regCount, revSum] = await Promise.all([
          this.prisma.user.count({
            where: { createdAt: { gte: d, lt: nextDay } },
          }),
          this.prisma.payment.aggregate({
            where: { status: 'APPROVED', createdAt: { gte: d, lt: nextDay } },
            _sum: { amount: true },
          }),
        ]);

        regValues.push(regCount);
        revValues.push(revSum._sum.amount ?? 0);
      }

      registrationTrend.labels = labels;
      registrationTrend.values = regValues;
      revenueTrend.labels = labels;
      revenueTrend.values = revValues;
    } else if (timeframe === 'weekly') {
      const weeks = [];
      const labels = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i * 7);
        d.setHours(0, 0, 0, 0);
        weeks.push(d);
        labels.push(`Wk ${6 - i}`);
      }

      const regValues = [];
      const revValues = [];

      for (let i = 0; i < weeks.length; i++) {
        const start = weeks[i];
        const end = i < weeks.length - 1 ? weeks[i + 1] : new Date();

        const [regCount, revSum] = await Promise.all([
          this.prisma.user.count({
            where: { createdAt: { gte: start, lt: end } },
          }),
          this.prisma.payment.aggregate({
            where: { status: 'APPROVED', createdAt: { gte: start, lt: end } },
            _sum: { amount: true },
          }),
        ]);

        regValues.push(regCount);
        revValues.push(revSum._sum.amount ?? 0);
      }

      registrationTrend.labels = labels;
      registrationTrend.values = regValues;
      revenueTrend.labels = labels;
      revenueTrend.values = revValues;
    } else if (timeframe === 'monthly') {
      const months = [];
      const labels = [];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() - i);
        d.setHours(0, 0, 0, 0);
        months.push(d);
        labels.push(monthNames[d.getMonth()]);
      }

      const regValues = [];
      const revValues = [];

      for (let i = 0; i < months.length; i++) {
        const start = months[i];
        const end = new Date(start);
        end.setMonth(end.getMonth() + 1);

        const [regCount, revSum] = await Promise.all([
          this.prisma.user.count({
            where: { createdAt: { gte: start, lt: end } },
          }),
          this.prisma.payment.aggregate({
            where: { status: 'APPROVED', createdAt: { gte: start, lt: end } },
            _sum: { amount: true },
          }),
        ]);

        regValues.push(regCount);
        revValues.push(revSum._sum.amount ?? 0);
      }

      registrationTrend.labels = labels;
      registrationTrend.values = regValues;
      revenueTrend.labels = labels;
      revenueTrend.values = revValues;
    } else if (timeframe === 'yearly') {
      const months = [];
      const labels = [];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() - i);
        d.setHours(0, 0, 0, 0);
        months.push(d);
        labels.push(monthNames[d.getMonth()]);
      }

      const regValues = [];
      const revValues = [];

      for (let i = 0; i < months.length; i++) {
        const start = months[i];
        const end = new Date(start);
        end.setMonth(end.getMonth() + 1);

        const [regCount, revSum] = await Promise.all([
          this.prisma.user.count({
            where: { createdAt: { gte: start, lt: end } },
          }),
          this.prisma.payment.aggregate({
            where: { status: 'APPROVED', createdAt: { gte: start, lt: end } },
            _sum: { amount: true },
          }),
        ]);

        regValues.push(regCount);
        revValues.push(revSum._sum.amount ?? 0);
      }

      registrationTrend.labels = labels;
      registrationTrend.values = regValues;
      revenueTrend.labels = labels;
      revenueTrend.values = revValues;
    }

    return {
      registrationTrend,
      revenueTrend,
    };
  }
}