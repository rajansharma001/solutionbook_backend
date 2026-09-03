import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminAssignmentService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllSubmissions(courseId?: string, status?: string, page = 1, limit = 20) {
    const where: any = {};
    if (courseId) {
      where.assignment = { lesson: { courseId } };
    }
    if (status) {
      where.status = status;
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.assignmentSubmission.findMany({
        where,
        skip,
        take: limit,
        include: {
          student: {
            select: { id: true, email: true, name: true, profileImage: true, profileData: true },
          },
          assignment: {
            include: {
              lesson: {
                select: {
                  title: true,
                  course: {
                    select: {
                      id: true,
                      title: true,
                      teacherId: true,
                      teacher: { select: { id: true, email: true, name: true } },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { submittedAt: 'desc' },
      }),
      this.prisma.assignmentSubmission.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async adminGradeSubmission(
    submissionId: string,
    data: { marks: number; feedback: string; status: string },
  ) {
    const submission = await this.prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      include: { assignment: true },
    });
    if (!submission) throw new NotFoundException('Submission not found');

    return this.prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: {
        marks: Number(data.marks),
        feedback: data.feedback,
        status: data.status,
        gradedAt: new Date(),
      },
      include: {
        student: { select: { id: true, name: true, email: true } },
        assignment: true,
      },
    });
  }
}