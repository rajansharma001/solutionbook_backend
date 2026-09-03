import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByVerificationToken(token: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { verificationToken: token },
    });
  }

  async findByResetToken(token: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { gt: new Date() },
      },
    });
  }

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  async verifyEmail(email: string): Promise<User> {
    return this.prisma.user.update({
      where: { email },
      data: { isEmailVerified: true, verificationToken: null },
    });
  }

  async updateUser(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  async deleteUser(id: string): Promise<User> {
    return this.prisma.user.delete({ where: { id } });
  }

  async findAll(search?: string): Promise<User[]> {
    return this.prisma.user.findMany({
      where: search
        ? { OR: [{ email: { contains: search } }] }
        : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        profileImage: true,
        profileData: true,
        isEmailVerified: true,
        isActive: true,
        createdAt: true,
        studentProfile: true,
        instructorProfile: true,
        enrollments: {
          include: {
            course: {
              include: {
                teacher: { select: { id: true, profileData: true, name: true, email: true } },
                _count: {
                  select: { lessons: true, modules: true }
                }
              }
            }
          }
        },
        reviews: {
          include: {
            course: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        certificates: {
          include: {
            course: true
          }
        },
        submissions: {
          include: {
            assignment: {
              include: {
                lesson: {
                  include: {
                    course: true,
                  },
                },
              },
            },
          },
          orderBy: {
            submittedAt: 'desc',
          },
        }
      },
    });
  }

  async deleteOwnReview(userId: string, reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException('Review not found');
    if (review.userId !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    await this.prisma.review.delete({
      where: { id: reviewId },
    });

    // Update Course Rating & Review Count
    const courseReviews = await this.prisma.review.findMany({ where: { courseId: review.courseId } });
    const cCount = courseReviews.length;
    const cRating = cCount > 0 ? courseReviews.reduce((acc, r) => acc + r.rating, 0) / cCount : 0.0;

    await this.prisma.course.update({
      where: { id: review.courseId },
      data: {
        rating: cRating,
        reviewCount: cCount,
      },
    });

    // Update Teacher Rating
    const course = await this.prisma.course.findUnique({ where: { id: review.courseId } });
    if (course) {
      const teacherCourses = await this.prisma.course.findMany({
        where: { teacherId: course.teacherId },
        select: { id: true },
      });
      const teacherCourseIds = teacherCourses.map(tc => tc.id);
      const teacherReviews = await this.prisma.review.findMany({
        where: { courseId: { in: teacherCourseIds } },
      });
      const tRating = teacherReviews.length > 0 ? teacherReviews.reduce((acc, r) => acc + r.rating, 0) / teacherReviews.length : 0.0;
      await this.prisma.instructorProfile.updateMany({
        where: { userId: course.teacherId },
        data: { rating: tRating },
      });
    }

    return { message: 'Review deleted successfully' };
  }

  async updateProfile(userId: string, data: any) {
    const user = await this.findById(userId);
    if (!user) throw new Error('User not found');

    const updateData: Prisma.UserUpdateInput = {};
    if (data.name !== undefined) {
      updateData.name = data.name;
      let currentData: any = {};
      try {
        if (user.profileData) {
          currentData = JSON.parse(user.profileData);
        }
      } catch (_) {}
      currentData.name = data.name;
      updateData.profileData = JSON.stringify(currentData);
    }
    if (data.profileImage !== undefined) updateData.profileImage = data.profileImage;
    if (data.profileData !== undefined) updateData.profileData = data.profileData;

    // Check if they updated instructor profile and are a TEACHER
    if (data.instructor && user.role === 'TEACHER') {
      await this.prisma.instructorProfile.upsert({
        where: { userId },
        create: {
          userId,
          headline: data.instructor.headline || '',
          bio: data.instructor.bio || '',
          expertise: data.instructor.expertise || '',
          yearsOfExperience: Number(data.instructor.yearsOfExperience) || 0,
        },
        update: {
          headline: data.instructor.headline,
          bio: data.instructor.bio,
          expertise: data.instructor.expertise,
          yearsOfExperience: data.instructor.yearsOfExperience !== undefined ? Number(data.instructor.yearsOfExperience) : undefined,
        },
      });
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        profileImage: true,
        profileData: true,
        studentProfile: true,
        instructorProfile: true,
      },
    });
  }
}

