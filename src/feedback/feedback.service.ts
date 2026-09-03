import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFeedbackDto) {
    return this.prisma.contactSubmission.create({
      data: {
        name: dto.name,
        email: dto.email,
        message: dto.message,
        page: dto.page || 'contact',
      },
    });
  }

  async findAll(page?: string, status?: string) {
    const where: Record<string, string> = {};
    if (page) where.page = page;
    if (status) where.status = status;
    return this.prisma.contactSubmission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.contactSubmission.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Submission not found');
    return item;
  }

  async updateStatus(id: string, status: string) {
    await this.findOne(id);
    return this.prisma.contactSubmission.update({
      where: { id },
      data: { status },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.contactSubmission.delete({ where: { id } });
  }
}
