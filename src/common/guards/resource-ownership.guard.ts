import { Injectable, CanActivate, ExecutionContext, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { SetMetadata } from '@nestjs/common';

export const RESOURCE_OWNERSHIP_KEY = 'resourceOwnership';

export interface ResourceOwnershipConfig {
  resourceType: 'course' | 'lesson' | 'module' | 'quiz' | 'assignment' | 'conversation' | 'studyMaterial' | 'enrollment';
  paramName?: string;
  checkEnrollment?: boolean;
  allowTeacher?: boolean;
  allowAdmin?: boolean;
}

export const ResourceOwnership = (config: ResourceOwnershipConfig) => SetMetadata(RESOURCE_OWNERSHIP_KEY, config);

@Injectable()
export class ResourceOwnershipGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const config = this.reflector.getAllAndOverride<ResourceOwnershipConfig>(
      RESOURCE_OWNERSHIP_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!config) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const params = request.params;

    if (!user || !user.sub) {
      throw new ForbiddenException('Authentication required');
    }

    const resourceId = params[config.paramName || 'id'];
    if (!resourceId) {
      throw new BadRequestException(`Missing resource ID parameter: ${config.paramName || 'id'}`);
    }

    const userId = user.sub;
    const userRole = user.role;

    if (config.allowAdmin !== false && userRole === 'ADMIN') {
      return true;
    }

    if (config.allowTeacher && userRole === 'TEACHER') {
      const hasAccess = await this.checkTeacherAccess(config.resourceType, resourceId, userId);
      if (hasAccess) return true;
    }

    switch (config.resourceType) {
      case 'course':
        return this.checkCourseAccess(resourceId, userId, config.checkEnrollment);
      case 'lesson':
        return this.checkLessonAccess(resourceId, userId, config.checkEnrollment);
      case 'module':
        return this.checkModuleAccess(resourceId, userId, config.checkEnrollment);
      case 'quiz':
        return this.checkQuizAccess(resourceId, userId, config.checkEnrollment);
      case 'assignment':
        return this.checkAssignmentAccess(resourceId, userId, config.checkEnrollment);
      case 'conversation':
        return this.checkConversationAccess(resourceId, userId);
      case 'studyMaterial':
        return this.checkStudyMaterialAccess(resourceId, userId);
      case 'enrollment':
        return this.checkEnrollmentAccess(resourceId, userId);
      default:
        throw new ForbiddenException(`Unsupported resource type: ${config.resourceType}`);
    }
  }

  private async checkCourseAccess(courseId: string, userId: string, checkEnrollment?: boolean): Promise<boolean> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { teacherId: true, status: true, isPublished: true },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.teacherId === userId) {
      return true;
    }

    if (checkEnrollment) {
      const enrollment = await this.prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId: userId, courseId } },
      });
      if (!enrollment) {
        throw new ForbiddenException('You must be enrolled in this course');
      }
      return true;
    }

    if (course.status === 'PUBLISHED' && course.isPublished) {
      return true;
    }

    throw new ForbiddenException('You do not have access to this course');
  }

  private async checkLessonAccess(lessonId: string, userId: string, checkEnrollment?: boolean): Promise<boolean> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { course: { select: { teacherId: true, status: true, isPublished: true, id: true } } },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    if (lesson.course.teacherId === userId) {
      return true;
    }

    if (checkEnrollment) {
      const enrollment = await this.prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId: userId, courseId: lesson.course.id } },
      });
      if (!enrollment) {
        throw new ForbiddenException('You must be enrolled in this course to access this lesson');
      }
      return true;
    }

    if (lesson.isFreePreview || (lesson.course.status === 'PUBLISHED' && lesson.course.isPublished)) {
      return true;
    }

    throw new ForbiddenException('You do not have access to this lesson');
  }

  private async checkModuleAccess(moduleId: string, userId: string, checkEnrollment?: boolean): Promise<boolean> {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      include: { course: { select: { teacherId: true, status: true, isPublished: true, id: true } } },
    });

    if (!module) {
      throw new NotFoundException('Module not found');
    }

    if (module.course.teacherId === userId) {
      return true;
    }

    if (checkEnrollment) {
      const enrollment = await this.prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId: userId, courseId: module.course.id } },
      });
      if (!enrollment) {
        throw new ForbiddenException('You must be enrolled in this course');
      }
      return true;
    }

    if (module.course.status === 'PUBLISHED' && module.course.isPublished) {
      return true;
    }

    throw new ForbiddenException('You do not have access to this module');
  }

  private async checkQuizAccess(quizId: string, userId: string, checkEnrollment?: boolean): Promise<boolean> {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        lesson: { include: { course: { select: { teacherId: true, status: true, isPublished: true, id: true } } } },
        course: { select: { teacherId: true, status: true, isPublished: true, id: true } },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    const course = quiz.lesson?.course || quiz.course;
    if (!course) {
      throw new NotFoundException('Associated course not found');
    }

    if (course.teacherId === userId) {
      return true;
    }

    if (checkEnrollment) {
      const enrollment = await this.prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId: userId, courseId: course.id } },
      });
      if (!enrollment) {
        throw new ForbiddenException('You must be enrolled in this course');
      }
      return true;
    }

    if (course.status === 'PUBLISHED' && course.isPublished) {
      return true;
    }

    throw new ForbiddenException('You do not have access to this quiz');
  }

  private async checkAssignmentAccess(assignmentId: string, userId: string, checkEnrollment?: boolean): Promise<boolean> {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { lesson: { include: { course: { select: { teacherId: true, status: true, isPublished: true, id: true } } } } },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (assignment.lesson.course.teacherId === userId) {
      return true;
    }

    if (checkEnrollment) {
      const enrollment = await this.prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId: userId, courseId: assignment.lesson.courseId } },
      });
      if (!enrollment) {
        throw new ForbiddenException('You must be enrolled in this course');
      }
      return true;
    }

    if (assignment.lesson.course.status === 'PUBLISHED' && assignment.lesson.course.isPublished) {
      return true;
    }

    throw new ForbiddenException('You do not have access to this assignment');
  }

  private async checkConversationAccess(conversationId: string, userId: string): Promise<boolean> {
    const participant = await this.prisma.participant.findFirst({
      where: { conversationId, userId },
    });

    if (!participant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    return true;
  }

  private async checkStudyMaterialAccess(studyMaterialId: string, userId: string): Promise<boolean> {
    const material = await this.prisma.studyMaterial.findUnique({
      where: { id: studyMaterialId },
      select: { authorId: true, status: true, isFree: true, price: true },
    });

    if (!material) {
      throw new NotFoundException('Study material not found');
    }

    if (material.authorId === userId) {
      return true;
    }

    if (material.status === 'PUBLISHED' && material.isFree) {
      return true;
    }

    const access = await this.prisma.resourceAccess.findUnique({
      where: { userId_studyMaterialId: { userId, studyMaterialId } },
    });

    if (access) {
      return true;
    }

    throw new ForbiddenException('You do not have access to this study material');
  }

  private async checkEnrollmentAccess(enrollmentId: string, userId: string): Promise<boolean> {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { course: { select: { teacherId: true } } },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    if (enrollment.studentId === userId) {
      return true;
    }

    if (enrollment.course.teacherId === userId) {
      return true;
    }

    throw new ForbiddenException('You do not have access to this enrollment');
  }

  private async checkTeacherAccess(resourceType: string, resourceId: string, userId: string): Promise<boolean> {
    switch (resourceType) {
      case 'course': {
        const course = await this.prisma.course.findUnique({ where: { id: resourceId }, select: { teacherId: true } });
        return course?.teacherId === userId;
      }
      case 'lesson': {
        const lesson = await this.prisma.lesson.findUnique({
          where: { id: resourceId },
          include: { course: { select: { teacherId: true } } },
        });
        return lesson?.course.teacherId === userId;
      }
      case 'module': {
        const module = await this.prisma.module.findUnique({
          where: { id: resourceId },
          include: { course: { select: { teacherId: true } } },
        });
        return module?.course.teacherId === userId;
      }
      case 'quiz': {
        const quiz = await this.prisma.quiz.findUnique({
          where: { id: resourceId },
          include: { lesson: { include: { course: { select: { teacherId: true } } } }, course: { select: { teacherId: true } } },
        });
        return quiz?.lesson?.course.teacherId === userId || quiz?.course.teacherId === userId;
      }
      case 'assignment': {
        const assignment = await this.prisma.assignment.findUnique({
          where: { id: resourceId },
          include: { lesson: { include: { course: { select: { teacherId: true } } } } },
        });
        return assignment?.lesson.course.teacherId === userId;
      }
      default:
        return false;
    }
  }
}