import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';


@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}


  // ─── Dashboard Stats ────────────────────────────────────────────────────────

  async getDashboardStats() {
    const [totalUsers, totalCourses, totalEnrollments, pendingCourses] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.course.count(),
        this.prisma.enrollment.count(),
        this.prisma.course.count({ where: { status: 'DRAFT', adminVerified: false } }),
      ]);

    // Revenue: sum of course prices × enrollment counts
    const courses = await this.prisma.course.findMany({
      select: {
        price: true,
        _count: { select: { enrollments: true } },
      },
    });
    const totalRevenue = courses.reduce(
      (acc, c) => acc + c.price * c._count.enrollments,
      0,
    );

    const recentUsers = await this.prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, role: true, createdAt: true, profileData: true },
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

    return {
      totalUsers,
      totalCourses,
      totalEnrollments,
      pendingCourses,
      totalRevenue,
      recentUsers,
      recentCourses,
    };
  }

  // ─── User Management ────────────────────────────────────────────────────────

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
      throw new BadRequestException(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
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

  // ─── Course Management ──────────────────────────────────────────────────────

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

    return { courses, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async approveCourse(courseId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    return this.prisma.course.update({
      where: { id: courseId },
      data: { adminVerified: true, status: 'PUBLISHED' },
    });
  }

  async rejectCourse(courseId: string, reason?: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    return this.prisma.course.update({
      where: { id: courseId },
      data: { status: 'REJECTED', adminVerified: false },
    });
  }

  async deleteCourse(courseId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    await this.prisma.course.delete({ where: { id: courseId } });
    return { message: 'Course deleted successfully' };
  }

  // ─── Enrollment Management ──────────────────────────────────────────────────

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

    return { enrollments, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async deleteEnrollment(enrollmentId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({ where: { id: enrollmentId } });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    await this.prisma.enrollment.delete({ where: { id: enrollmentId } });
    return { message: 'Enrollment removed successfully' };
  }

  async createEnrollment(studentId: string, courseId: string) {
    const student = await this.prisma.user.findUnique({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Student not found');

    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');

    // Check if already enrolled
    const existing = await this.prisma.enrollment.findUnique({
      where: {
        studentId_courseId: { studentId, courseId },
      },
    });

    if (existing) {
      throw new BadRequestException('Student is already enrolled in this course');
    }

    return this.prisma.enrollment.create({
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
    });
  }

  async sendUserVerification(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.isEmailVerified) {
      throw new BadRequestException('User is already email-verified');
    }

    // Generate fresh verification token if none exists
    const token = user.verificationToken || crypto.randomBytes(32).toString('hex');
    if (!user.verificationToken) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { verificationToken: token },
      });
    }

    await this.mailService.sendVerificationEmail(user.email, token);
    return { message: 'Verification code/email sent successfully' };
  }

  async getStudentsProgress() {
    return this.prisma.user.findMany({
      where: { role: 'STUDENT' },
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
    });
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

  // ─── System Settings persistence ──────────────────────────────────────────────

  private getSettingsFilePath() {
    return path.join(__dirname, 'settings.json');
  }

  async getSettings() {
    const filePath = this.getSettingsFilePath();
    const defaults = {
      siteName: 'SikshyaHub',
      contactEmail: 'admin@sikshyahub.local',
      contactPhone: '+977-1-4400000',
      contactAddress: 'Kathmandu, Nepal',
      logoText: 'SikshyaHub',
      heroTitle: 'Master Your Exams with Expert-Crafted Learning',
      heroSubtitle: 'Join 15,000+ students who are acing BLE, SEE, NEB, and Loksewa exams through our interactive courses, practice quizzes, and AI-powered tutoring on SikshyaHub.',
      heroCtaText: 'Explore Courses',
      heroCtaLink: '/courses',
      commTitle: 'Join the Learning Community',
      commDescription: 'Connect with thousands of students across Nepal. Discuss recent question papers, clear complex doubts, share exam preparation strategies, and prepare together.',
      commCtaText: 'Join Discord Server',
      commCtaLink: 'https://discord.gg/sikshyahub',
      commWhatsAppLink: 'https://chat.whatsapp.com/sikshyahub',
      features: [
        {
          title: 'Syllabus Aligned',
          desc: 'Every note, video, and quiz is strictly aligned with the latest CDC (Curriculum Development Centre) and Loksewa guidelines.'
        },
        {
          title: 'Gamified Practice',
          desc: 'Earn points for completing quizzes accurately and quickly. Level up your profile and climb the national leaderboards.'
        },
        {
          title: 'AI Course Tutor',
          desc: 'Stuck on a concept? Our AI tutor reads the specific course notes and explains it to you instantly, 24/7.'
        },
        {
          title: 'Past Paper Solutions',
          desc: 'Access 10+ years of BLE, SEE, and NEB past board questions with detailed, step-by-step verified solutions.'
        },
        {
          title: 'Learn Anywhere',
          desc: 'Fully responsive platform. Download PDF notes for offline reading or watch video lectures directly on your mobile.'
        },
        {
          title: 'Community Support',
          desc: 'Join course-specific chat rooms to discuss questions with peers or direct message your instructors for clarification.'
        }
      ],
      maintenanceMode: false,
      allowRegistrations: true,
      requireEmailVerification: true,
    };

    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaults, null, 2));
      return defaults;
    }
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(content);
      return { ...defaults, ...parsed };
    } catch {
      return defaults;
    }
  }

  async updateSettings(body: any) {
    const filePath = this.getSettingsFilePath();
    const current = await this.getSettings();
    const updated = {
      siteName: body.siteName ?? current.siteName,
      contactEmail: body.contactEmail ?? current.contactEmail,
      contactPhone: body.contactPhone ?? current.contactPhone,
      contactAddress: body.contactAddress ?? current.contactAddress,
      logoText: body.logoText ?? current.logoText,
      heroTitle: body.heroTitle ?? current.heroTitle,
      heroSubtitle: body.heroSubtitle ?? current.heroSubtitle,
      heroCtaText: body.heroCtaText ?? current.heroCtaText,
      heroCtaLink: body.heroCtaLink ?? current.heroCtaLink,
      commTitle: body.commTitle ?? current.commTitle,
      commDescription: body.commDescription ?? current.commDescription,
      commCtaText: body.commCtaText ?? current.commCtaText,
      commCtaLink: body.commCtaLink ?? current.commCtaLink,
      commWhatsAppLink: body.commWhatsAppLink ?? current.commWhatsAppLink,
      features: body.features ?? current.features,
      maintenanceMode: body.maintenanceMode ?? current.maintenanceMode,
      allowRegistrations: body.allowRegistrations ?? current.allowRegistrations,
      requireEmailVerification: body.requireEmailVerification ?? current.requireEmailVerification,
    };
    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2));
    return updated;
  }

  // ─── Certificates Management ──────────────────────────────────────────────────

  async getAllCertificates() {
    return this.prisma.certificate.findMany({
      include: {
        user: { select: { id: true, email: true, name: true, profileData: true } },
        course: { select: { id: true, title: true } },
      },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async manualAwardCertificate(studentId: string, courseId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: studentId } });
    if (!user) throw new NotFoundException('Student account not found');

    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');

    const existing = await this.prisma.certificate.findFirst({
      where: { userId: studentId, courseId },
    });

    if (existing) {
      throw new BadRequestException('A completion certificate has already been issued to this student.');
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
        user: { select: { id: true, email: true, name: true, profileData: true } },
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

  // ─── Reviews Moderation ───────────────────────────────────────────────────────

  async getAllReviews() {
    return this.prisma.review.findMany({
      include: {
        user: { select: { id: true, email: true, name: true, profileData: true } },
        course: { select: { id: true, title: true, teacherId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async moderateReview(id: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: { course: true },
    });

    if (!review) throw new NotFoundException('Review not found');

    const { courseId } = review;
    await this.prisma.review.delete({ where: { id } });

    // Recalculate Course Rating Average
    const courseReviews = await this.prisma.review.findMany({ where: { courseId } });
    const count = courseReviews.length;
    const rating = count > 0 ? courseReviews.reduce((acc, r) => acc + r.rating, 0) / count : 0.0;

    await this.prisma.course.update({
      where: { id: courseId },
      data: {
        rating,
        reviewCount: count,
      },
    });

    // Recalculate Teacher average rating
    const teacherCourses = await this.prisma.course.findMany({
      where: { teacherId: review.course.teacherId },
      select: { id: true },
    });

    const teacherCourseIds = teacherCourses.map(tc => tc.id);
    const teacherReviews = await this.prisma.review.findMany({
      where: { courseId: { in: teacherCourseIds } },
    });

    const tRating = teacherReviews.length > 0 ? teacherReviews.reduce((acc, r) => acc + r.rating, 0) / teacherReviews.length : 0.0;
    await this.prisma.instructorProfile.updateMany({
      where: { userId: review.course.teacherId },
      data: { rating: tRating },
    });

    return { message: 'Review successfully moderated and ratings recalculated.' };
  }
}

