import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminReviewService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllReviews(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, email: true, name: true, profileData: true },
          },
          course: { select: { id: true, title: true, teacherId: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count(),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async moderateReview(id: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: { course: true },
    });

    if (!review) throw new NotFoundException('Review not found');

    const { courseId } = review;
    await this.prisma.review.delete({ where: { id } });

    const courseReviews = await this.prisma.review.findMany({
      where: { courseId },
    });
    const count = courseReviews.length;
    const rating =
      count > 0
        ? courseReviews.reduce((acc, r) => acc + r.rating, 0) / count
        : 0.0;

    await this.prisma.course.update({
      where: { id: courseId },
      data: {
        rating,
        reviewCount: count,
      },
    });

    const teacherCourses = await this.prisma.course.findMany({
      where: { teacherId: review.course.teacherId },
      select: { id: true },
    });

    const teacherCourseIds = teacherCourses.map((tc) => tc.id);
    const teacherReviews = await this.prisma.review.findMany({
      where: { courseId: { in: teacherCourseIds } },
    });

    const tRating =
      teacherReviews.length > 0
        ? teacherReviews.reduce((acc, r) => acc + r.rating, 0) /
          teacherReviews.length
        : 0.0;
    await this.prisma.instructorProfile.updateMany({
      where: { userId: review.course.teacherId },
      data: { rating: tRating },
    });

    return {
      message: 'Review successfully moderated and ratings recalculated.',
    };
  }
}