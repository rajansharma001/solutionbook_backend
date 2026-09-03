import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InstitutionsService {
  constructor(private readonly prisma: PrismaService) {}

  // ────────────────────────────────────────────────────────
  // ADMIN API
  // ────────────────────────────────────────────────────────

  async getAllInstitutions() {
    return this.prisma.institution.findMany({
      include: { licenses: { include: { course: true } } },
    });
  }

  async createInstitution(data: {
    name: string;
    contactName: string;
    email: string;
  }) {
    return this.prisma.institution.create({
      data: {
        name: data.name,
        contactName: data.contactName,
        email: data.email,
      },
    });
  }

  async allocateLicenses(
    institutionId: string,
    data: { courseId: string; totalSeats: number },
  ) {
    return this.prisma.institutionLicense.upsert({
      where: {
        institutionId_courseId: { institutionId, courseId: data.courseId },
      },
      update: { totalSeats: { increment: data.totalSeats } },
      create: {
        institutionId,
        courseId: data.courseId,
        totalSeats: data.totalSeats,
      },
    });
  }

  async addInstitutionAdmin(institutionId: string, userId: string) {
    return this.prisma.institutionMember.create({
      data: {
        institutionId,
        userId,
        role: 'ADMIN',
      },
    });
  }

  // ────────────────────────────────────────────────────────
  // INSTITUTION ADMIN API
  // ────────────────────────────────────────────────────────

  async getMyInstitution(userId: string) {
    const member = await this.prisma.institutionMember.findUnique({
      where: { userId },
      include: {
        institution: {
          include: {
            licenses: { include: { course: true } },
            members: { include: { user: true } },
          },
        },
      },
    });

    if (!member || member.role !== 'ADMIN') {
      throw new BadRequestException('You are not an institution admin');
    }

    return member.institution;
  }

  async inviteStudent(adminId: string, email: string, courseId: string) {
    // 1. Verify admin
    const adminMember = await this.prisma.institutionMember.findUnique({
      where: { userId: adminId },
      include: { institution: true },
    });

    if (!adminMember || adminMember.role !== 'ADMIN') {
      throw new BadRequestException('Not authorized');
    }

    const institutionId = adminMember.institutionId;

    // 2. Check seats
    const license = await this.prisma.institutionLicense.findUnique({
      where: { institutionId_courseId: { institutionId, courseId } },
    });

    if (!license || license.usedSeats >= license.totalSeats) {
      throw new BadRequestException('No seats available for this course');
    }

    // 3. Find or fail user
    const student = await this.prisma.user.findUnique({ where: { email } });
    if (!student) {
      throw new NotFoundException(
        'Student account not found on platform yet. Please ask them to register first.',
      );
    }

    // 4. Enroll student & consume seat
    const [enrollment, updatedLicense] = await this.prisma.$transaction([
      this.prisma.enrollment.create({
        data: {
          studentId: student.id,
          courseId,
        },
      }),
      this.prisma.institutionLicense.update({
        where: { id: license.id },
        data: { usedSeats: { increment: 1 } },
      }),
      this.prisma.institutionMember.upsert({
        where: { userId: student.id },
        update: {},
        create: {
          institutionId,
          userId: student.id,
          role: 'STUDENT',
        },
      }),
    ]);

    return {
      message: 'Student successfully invited and enrolled',
      enrollment,
      updatedLicense,
    };
  }
}
