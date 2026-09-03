import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async trackLessonView(lessonId: string, watchTime: number = 0) {
    const existing = await this.prisma.lessonAnalytics.findUnique({
      where: { lessonId },
    });

    const newViews = (existing?.views ?? 0) + 1;
    const newTotalWatch = (existing?.totalWatchTimeSecs ?? 0) + watchTime;
    const newAvg = newViews > 0 ? newTotalWatch / newViews : 0;

    const analytics = await this.prisma.lessonAnalytics.upsert({
      where: { lessonId },
      update: {
        views: { increment: 1 },
        totalWatchTimeSecs: { increment: watchTime },
        avgWatchTimeSecs: newAvg,
      },
      create: {
        lessonId,
        views: 1,
        totalWatchTimeSecs: watchTime,
        avgWatchTimeSecs: watchTime,
      },
    });
    return analytics;
  }

  async getCourseFunnel(courseId: string) {
    // A real funnel: Number of Enrollments vs. Completions per Lesson
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          include: {
            lessons: {
              include: {
                LessonAnalytics: true,
              },
              orderBy: { id: 'asc' },
            },
          },
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!course) return null;

    const totalEnrollments = await this.prisma.enrollment.count({
      where: { courseId },
    });

    const funnelData: Record<string, unknown>[] = [];

    // Flatten lessons to build the funnel
    course.modules.forEach((mod) => {
      mod.lessons.forEach((lesson) => {
        const stats = lesson.LessonAnalytics;
        const views = stats?.views || 0;
        const completions = stats?.completions || 0;

        // Drop off rate: Out of total people who viewed, how many didn't complete?
        let dropOffRate = 0;
        if (views > 0) {
          dropOffRate = ((views - completions) / views) * 100;
        }

        funnelData.push({
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          views,
          completions,
          dropOffRate: Math.round(dropOffRate),
        });
      });
    });

    return {
      courseId,
      courseTitle: course.title,
      totalEnrollments,
      funnel: funnelData,
    };
  }

  async getPlatformOverview() {
    // High level metrics for admin
    const totalUsers = await this.prisma.user.count();
    const totalEnrollments = await this.prisma.enrollment.count();
    const totalCourses = await this.prisma.course.count();

    return {
      totalUsers,
      totalEnrollments,
      totalCourses,
    };
  }
}
