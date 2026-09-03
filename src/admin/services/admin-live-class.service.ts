import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminLiveClassService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllLiveClasses() {
    return this.prisma.liveClass.findMany({
      orderBy: { startTime: 'desc' },
      include: {
        course: { select: { title: true } },
        teacher: { select: { name: true, email: true } },
        courseLinks: { include: { course: { select: { id: true, title: true } } } },
      },
    });
  }

  async createLiveClass(
    data: {
      title: string;
      description?: string;
      courseIds: string[];
      startTime: string;
      endTime?: string;
      requireEnrollment: boolean;
      assignedTeacherId?: string;
    },
  ) {
    if (data.courseIds.length === 0) throw new NotFoundException('At least one course is required');

    const courses = await this.prisma.course.findMany({
      where: { id: { in: data.courseIds } },
    });
    if (courses.length !== data.courseIds.length) throw new NotFoundException('One or more courses not found');

    const teacherId = data.assignedTeacherId || courses[0].teacherId;
    const primaryCourseId = data.courseIds[0];

    const liveClass = await this.prisma.liveClass.create({
      data: {
        title: data.title,
        description: data.description,
        courseId: primaryCourseId,
        teacherId,
        startTime: new Date(data.startTime),
        endTime: data.endTime ? new Date(data.endTime) : undefined,
        status: 'SCHEDULED',
        requireEnrollment: data.requireEnrollment,
        courseLinks: {
          create: data.courseIds.map((courseId) => ({ courseId })),
        },
      },
    });

    return liveClass;
  }

  async deleteLiveClass(id: string) {
    const liveClass = await this.prisma.liveClass.findUnique({ where: { id } });
    if (!liveClass) throw new NotFoundException('Live class not found');
    
    return this.prisma.liveClass.delete({ where: { id } });
  }

  async updateLiveClass(id: string, data: any) {
    const liveClass = await this.prisma.liveClass.findUnique({ where: { id } });
    if (!liveClass) throw new NotFoundException('Live class not found');

    const updateData: any = {
      title: data.title,
      description: data.description,
      teacherId: data.teacherId,
      startTime: data.startTime ? new Date(data.startTime) : undefined,
    };

    if (data.courseIds && data.courseIds.length > 0) {
      updateData.courseId = data.courseIds[0];
    } else if (data.courseId) {
      updateData.courseId = data.courseId;
      updateData.courseLinks = data.courseId
        ? { deleteMany: {}, create: [{ courseId: data.courseId }] }
        : undefined;
    }

    if (data.courseIds) {
      updateData.courseLinks = {
        deleteMany: {},
        create: data.courseIds.map((courseId: string) => ({ courseId })),
      };
    }

    return this.prisma.liveClass.update({
      where: { id },
      data: updateData,
      include: {
        course: { select: { title: true } },
        teacher: { select: { name: true, email: true } },
        courseLinks: { include: { course: { select: { id: true, title: true } } } },
      },
    });
  }
}