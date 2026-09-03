import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../../settings/settings.service';

@Injectable()
export class AdminEnrollmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
  ) {}

  async getAllEnrollments(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [enrollments, total] = await Promise.all([
      this.prisma.enrollment.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          student: { select: { id: true, email: true, profileData: true } },
          course: { select: { id: true, title: true, price: true } },
        },
      }),
      this.prisma.enrollment.count(),
    ]);

    return {
      enrollments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async deleteEnrollment(enrollmentId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    await this.prisma.enrollment.delete({ where: { id: enrollmentId } });
    return { message: 'Enrollment removed successfully' };
  }

  async createEnrollment(studentId: string, courseId: string, adminId: string) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
    });
    if (!student) throw new NotFoundException('Student not found');

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException('Course not found');

    const existing = await this.prisma.enrollment.findUnique({
      where: {
        studentId_courseId: { studentId, courseId },
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Student is already enrolled in this course',
      );
    }

    const commissionSetting = await this.settingsService.getSetting(
      'PLATFORM_COMMISSION_PERCENTAGE',
    );
    const commission = commissionSetting?.value
      ? parseFloat(commissionSetting.value)
      : 20;
    const instructorEarned = course.price * ((100 - commission) / 100);

    const [enrollment] = await this.prisma.$transaction([
      this.prisma.enrollment.create({
        data: {
          studentId,
          courseId,
          paymentStatus: 'PAID',
          amount: course.price,
        },
        include: {
          student: { select: { id: true, email: true, profileData: true } },
          course: { select: { id: true, title: true, price: true } },
        },
      }),
      this.prisma.payment.create({
        data: {
          userId: studentId,
          courseId,
          amount: course.price,
          instructorEarned,
          status: 'APPROVED',
          paymentMethod: 'ADMIN_ENROLLMENT',
          receiptUrl: '',
          verifiedById: adminId,
          verifiedAt: new Date(),
        },
      }),
    ]);

    return enrollment;
  }
}