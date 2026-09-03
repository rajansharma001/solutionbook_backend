import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GamificationService {
  constructor(private readonly prisma: PrismaService) {}

  async getLeaderboard(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [profiles, total] = await Promise.all([
      this.prisma.studentProfile.findMany({
        orderBy: { totalXP: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, email: true, profileImage: true },
          },
        },
      }),
      this.prisma.studentProfile.count(),
    ]);

    const data = profiles.map((p, idx) => ({
      rank: skip + idx + 1,
      userId: p.userId,
      name: p.user.name || p.user.email,
      profileImage: p.user.profileImage,
      totalXP: p.totalXP,
      streak: p.streak,
      learningHours: p.learningHours,
    }));

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getMyStats(userId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return {
        totalXP: 0,
        streak: 0,
        learningHours: 0,
        rank: null,
      };
    }

    // Calculate rank
    const rank = await this.prisma.studentProfile.count({
      where: { totalXP: { gt: profile.totalXP } },
    });

    return {
      totalXP: profile.totalXP,
      streak: profile.streak,
      learningHours: profile.learningHours,
      rank: rank + 1,
    };
  }

  getConfig() {
    return {
      levels: [0, 100, 300, 600, 1000, 1500, 2500, 4000, 6000, 10000],
      modes: [
        {
          id: 'daily_streak',
          name: 'Daily Streak',
          description: 'Maintain your streak for bonuses.',
        },
        {
          id: 'mastery',
          name: 'Subject Mastery',
          description: 'Complete all modules in a course.',
        },
        {
          id: 'speed_learner',
          name: 'Speed Learner',
          description: 'Finish a course within a week.',
        },
      ],
    };
  }

  async getHeatmap(userId: string) {
    const progress = await this.prisma.userProgress.findMany({
      where: { userId },
      select: { updatedAt: true },
    });

    const heatmap: Record<string, number> = {};
    progress.forEach((p) => {
      const date = p.updatedAt.toISOString().split('T')[0];
      heatmap[date] = (heatmap[date] || 0) + 1;
    });

    return Object.entries(heatmap).map(([date, count]) => ({ date, count }));
  }

  async getWeeklyProgress(userId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
      select: { weeklyGoal: true },
    });

    if (!profile) return { goal: 5, current: 0 };

    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(now.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);

    const completedThisWeek = await this.prisma.userProgress.count({
      where: {
        userId,
        completed: true,
        updatedAt: { gte: startOfWeek },
      },
    });

    return {
      goal: profile.weeklyGoal,
      current: completedThisWeek,
    };
  }

  async updateWeeklyGoal(userId: string, goal: number) {
    const profile = await this.prisma.studentProfile.update({
      where: { userId },
      data: { weeklyGoal: goal },
    });
    return { success: true, goal: profile.weeklyGoal };
  }

  async getAllBadges() {
    return this.prisma.badge.findMany();
  }

  async getUserBadges(userId: string) {
    return this.prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
    });
  }

  async createBadge(data: {
    name: string;
    description: string;
    icon?: string;
    condition?: string;
  }) {
    return this.prisma.badge.create({
      data: {
        name: data.name,
        description: data.description,
        icon: data.icon || 'Trophy',
        criteria: data.condition || 'MANUAL',
      },
    });
  }

  async deleteBadge(id: string) {
    return this.prisma.badge.delete({
      where: { id },
    });
  }
}
