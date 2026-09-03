import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { YoutubeService } from './youtube.service';
import { LiveGateway } from './live.gateway';

@Injectable()
export class LiveService {
  constructor(
    private prisma: PrismaService,
    private youtubeService: YoutubeService,
    private liveGateway: LiveGateway,
  ) {}

  async createLiveClass(
    userId: string,
    userRole: string,
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
    if (data.courseIds.length === 0) {
      throw new NotFoundException('At least one course is required');
    }

    const courses = await this.prisma.course.findMany({
      where: { id: { in: data.courseIds } },
    });

    if (courses.length !== data.courseIds.length) {
      throw new NotFoundException('One or more courses not found');
    }

    const targetTeacherId = data.assignedTeacherId || courses[0].teacherId;

    if (userRole === 'ADMIN') {
      // Admins can create classes for anyone
    } else {
      // Teachers can only create classes for their own courses
      if (courses[0].teacherId !== userId || data.assignedTeacherId) {
        throw new ForbiddenException(
          'You are not authorized to create a live class for this course or assign a different teacher',
        );
      }
    }

    const primaryCourseId = data.courseIds[0];
    const restCourseIds = data.courseIds.slice(1);

    const liveClass = await this.prisma.liveClass.create({
      data: {
        title: data.title,
        description: data.description,
        courseId: primaryCourseId,
        teacherId: targetTeacherId,
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

  async findById(id: string) {
    const liveClass = await this.prisma.liveClass.findUnique({
      where: { id },
      include: {
        course: true,
        teacher: true,
        courseLinks: { include: { course: { select: { id: true, title: true } } } },
      },
    });
    if (!liveClass) throw new NotFoundException('Live class not found');
    return liveClass;
  }

  async startBroadcast(teacherId: string, role: string, liveClassId: string) {
    const liveClass = await this.findById(liveClassId);
    if (role !== 'ADMIN' && liveClass.teacherId !== teacherId) {
      throw new ForbiddenException('You can only start your own live classes');
    }

    if (liveClass.status === 'ENDED') {
      throw new ForbiddenException('Class has already ended');
    }

    if (!liveClass.youtubeStreamId) {
      // Create stream via YouTube API
      const ytStream = await this.youtubeService.createLiveStream(
        teacherId,
        liveClass.title,
        liveClass.description || 'SolutionBook Live Class',
      );

      const updated = await this.prisma.liveClass.update({
        where: { id: liveClassId },
        data: {
          youtubeVideoId: ytStream.youtubeLiveId,
          youtubeStreamId: ytStream.streamKey,
          status: 'LIVE',
        },
      });
      return { ...updated, rtmpUrl: ytStream.rtmpUrl };
    }

    const updated = await this.prisma.liveClass.update({
      where: { id: liveClassId },
      data: { status: 'LIVE' },
    });
    return updated;
  }

  async endBroadcast(teacherId: string, role: string, liveClassId: string) {
    const liveClass = await this.findById(liveClassId);
    if (role !== 'ADMIN' && liveClass.teacherId !== teacherId) {
      throw new ForbiddenException('You can only end your own live classes');
    }

    if (liveClass.status === 'COMPLETED' || liveClass.status === 'ENDED') {
      return liveClass;
    }

    // TODO: Optionally call YouTube API to transition broadcast status to 'complete'
    // For now, we just update local state.
    const updated = await this.prisma.liveClass.update({
      where: { id: liveClassId },
      data: {
        status: 'COMPLETED',
        endTime: new Date(),
      },
    });

    // Notify all connected clients that the class has ended
    this.liveGateway.server.to(liveClassId).emit('end_class', { liveClassId });

    return updated;
  }

  async getClassesForCourse(courseId: string) {
    return this.prisma.liveClass.findMany({
      where: {
        OR: [
          { courseId },
          { courseLinks: { some: { courseId } } },
        ],
      },
      include: {
        courseLinks: { include: { course: { select: { id: true, title: true } } } },
      },
      orderBy: { startTime: 'desc' },
    });
  }

  async getTeacherClasses(teacherId: string) {
    return this.prisma.liveClass.findMany({
      where: { teacherId },
      include: { course: true, courseLinks: { include: { course: { select: { id: true, title: true } } } } },
      orderBy: { startTime: 'desc' },
    });
  }

  async getStudentCalendar(userId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId: userId },
      select: { courseId: true },
    });

    const courseIds = enrollments.map((e) => e.courseId);

    return this.prisma.liveClass.findMany({
      where: {
        OR: [
          { courseId: { in: courseIds } },
          { courseLinks: { some: { courseId: { in: courseIds } } } },
        ],
      },
      include: {
        courseLinks: { include: { course: { select: { id: true, title: true } } } },
        teacher: { select: { name: true } },
      },
      orderBy: { startTime: 'asc' },
    });
  }
}
