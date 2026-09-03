import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AdminUserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async getAllUsers(search?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = search
      ? { OR: [{ email: { contains: search } }] }
      : undefined;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          role: true,
          isEmailVerified: true,
          isActive: true,
          createdAt: true,
          profileData: true,
          _count: { select: { enrollments: true, coursesTaught: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateUserRole(userId: string, role: string) {
    const validRoles = ['STUDENT', 'TEACHER', 'ADMIN'];
    if (!validRoles.includes(role)) {
      throw new BadRequestException(
        `Invalid role. Must be one of: ${validRoles.join(', ')}`,
      );
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, email: true, role: true },
    });
  }

  async updateUserStatus(userId: string, isActive: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: { id: true, email: true, isActive: true },
    });
  }

  async deleteUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.user.delete({ where: { id: userId } });
    return { message: 'User deleted successfully' };
  }

  async sendUserVerification(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.isEmailVerified) {
      throw new BadRequestException('User is already email-verified');
    }

    const token =
      user.verificationToken || crypto.randomBytes(32).toString('hex');
    if (!user.verificationToken) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { verificationToken: token },
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await this.prisma.otpCode.deleteMany({
      where: { email: user.email, purpose: 'VERIFY_EMAIL' },
    });
    await this.prisma.otpCode.create({
      data: {
        email: user.email,
        codeHash: await bcrypt.hash(otp, 10),
        purpose: 'VERIFY_EMAIL',
        expiresAt,
      },
    });

    await this.mailService.sendVerificationEmail(user.email, token, otp);

    return { message: 'Verification code/email sent successfully' };
  }

  async getStudentsProgress(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = { role: 'STUDENT' };
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          profileImage: true,
          profileData: true,
          createdAt: true,
          studentProfile: true,
          _count: { select: { enrollments: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getStudentDetailProgress(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        profileData: true,
        profileImage: true,
        createdAt: true,
        studentProfile: true,
        enrollments: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                level: true,
                duration: true,
                _count: { select: { lessons: true } },
              },
            },
          },
        },
        userProgress: {
          include: {
            lesson: {
              select: {
                id: true,
                title: true,
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}