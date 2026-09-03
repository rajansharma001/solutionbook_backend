import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

import { Request } from 'express';

@Injectable()
export class EnrollmentGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: { sub: string; role: string } }>();
    const user = req.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const liveId = (req.params as { id?: string }).id || (req.query as { id?: string }).id || (req.body as { id?: string }).id;

    if (!liveId) {
      return false;
    }

    const liveClass = await this.prisma.liveClass.findUnique({
      where: { id: liveId },
      include: { courseLinks: { select: { courseId: true } } },
    });

    if (!liveClass) {
      throw new ForbiddenException('Live class not found');
    }

    // Teachers and system admins are always allowed
    if (user.role === 'ADMIN' || user.role === 'TEACHER') {
      return true;
    }

    // If enrollment is not required (e.g. free public live class)
    if (!liveClass.requireEnrollment) {
      return true;
    }

    // Collect all course IDs for this live class (primary + junction)
    const courseIds = new Set<string>([liveClass.courseId]);
    for (const link of liveClass.courseLinks) {
      courseIds.add(link.courseId);
    }

    // Check if student has an active enrollment in ANY of the associated courses
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        studentId: user.sub,
        courseId: { in: Array.from(courseIds) },
      },
    });

    if (!enrollment) {
      throw new ForbiddenException(
        'You must be enrolled in this course to join the live class.',
      );
    }

    // Allow if payment is approved/paid
    if (enrollment.paymentStatus === 'APPROVED' || enrollment.paymentStatus === 'PAID') {
      return true;
    }

    // If payment is still pending, allow only if at least one associated course is free
    if (enrollment.paymentStatus === 'PENDING') {
      const courses = await this.prisma.course.findMany({
        where: { id: { in: Array.from(courseIds) } },
        select: { isFree: true, price: true },
      });
      const anyFree = courses.some((c) => c.isFree || c.price === 0);
      if (anyFree) {
        return true;
      }
    }

    throw new ForbiddenException(
      'You must be enrolled in this course to join the live class.',
    );
  }
}
