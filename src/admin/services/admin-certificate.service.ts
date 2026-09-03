import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminCertificateService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllCertificates(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.certificate.findMany({
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, email: true, name: true, profileData: true },
          },
          course: { select: { id: true, title: true } },
        },
        orderBy: { issuedAt: 'desc' },
      }),
      this.prisma.certificate.count(),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async manualAwardCertificate(studentId: string, courseId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: studentId },
    });
    if (!user) throw new NotFoundException('Student account not found');

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException('Course not found');

    const existing = await this.prisma.certificate.findFirst({
      where: { userId: studentId, courseId },
    });

    if (existing) {
      throw new BadRequestException(
        'A completion certificate has already been issued to this student.',
      );
    }

    const verificationCode = `MAN-AWARD-${courseId.slice(0, 4)}-${studentId.slice(0, 4)}-${Math.floor(1000 + Math.random() * 9000)}`;

    return this.prisma.certificate.create({
      data: {
        userId: studentId,
        courseId,
        certificateNumber: verificationCode,
        certificateUrl: `${process.env.BACKEND_URL || 'http://localhost:3000'}/certificates/${verificationCode}.pdf`,
      },
      include: {
        user: {
          select: { id: true, email: true, name: true, profileData: true },
        },
        course: { select: { id: true, title: true } },
      },
    });
  }

  async updateCertificate(
    id: string,
    data: { studentId?: string; courseId?: string; issuedAt?: string },
  ) {
    const cert = await this.prisma.certificate.findUnique({ where: { id } });
    if (!cert) throw new NotFoundException('Certificate not found');

    const updateData: any = {};
    if (data.studentId) {
      const user = await this.prisma.user.findUnique({ where: { id: data.studentId } });
      if (!user) throw new NotFoundException('Student account not found');
      updateData.userId = data.studentId;
    }
    if (data.courseId) {
      const course = await this.prisma.course.findUnique({ where: { id: data.courseId } });
      if (!course) throw new NotFoundException('Course not found');
      updateData.courseId = data.courseId;
    }
    if (data.issuedAt) {
      updateData.issuedAt = new Date(data.issuedAt);
    }

    const newUserId = data.studentId || cert.userId;
    const newCourseId = data.courseId || cert.courseId;

    if (newUserId !== cert.userId || newCourseId !== cert.courseId) {
      const existing = await this.prisma.certificate.findFirst({
        where: { userId: newUserId, courseId: newCourseId, id: { not: id } },
      });
      if (existing) {
        throw new BadRequestException('A completion certificate has already been issued to this student for this course.');
      }
    }

    return this.prisma.certificate.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, email: true, name: true, profileData: true },
        },
        course: { select: { id: true, title: true } },
      },
    });
  }

  async revokeCertificate(id: string) {
    const cert = await this.prisma.certificate.findUnique({ where: { id } });
    if (!cert) throw new NotFoundException('Certificate record not found');

    await this.prisma.certificate.delete({ where: { id } });
    return { message: 'Certificate revoked and deleted successfully.' };
  }
}