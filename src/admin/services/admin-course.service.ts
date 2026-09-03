import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminCourseService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllCourses(status?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = status && status !== 'ALL' ? { status } : undefined;

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          teacher: { select: { id: true, email: true, profileData: true } },
          _count: { select: { enrollments: true, modules: true } },
        },
      }),
      this.prisma.course.count({ where }),
    ]);

    return {
      courses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async approveCourse(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException('Course not found');
    return this.prisma.course.update({
      where: { id: courseId },
      data: { adminVerified: true, status: 'PUBLISHED' },
    });
  }

  async rejectCourse(courseId: string, reason?: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException('Course not found');
    return this.prisma.course.update({
      where: { id: courseId },
      data: { status: 'REJECTED', adminVerified: false },
    });
  }

  async deleteCourse(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException('Course not found');
    await this.prisma.course.delete({ where: { id: courseId } });
    return { message: 'Course deleted successfully' };
  }
}