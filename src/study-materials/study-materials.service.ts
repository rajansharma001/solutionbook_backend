import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudyMaterialDto } from './dto/study-material.dto';

@Injectable()
export class StudyMaterialsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStudyMaterialDto) {
    return this.prisma.studyMaterial.create({
      data: {
        title: dto.title,
        description: dto.description,
        fileUrl: dto.fileUrl,
        category: dto.category,
        classLevel: dto.classLevel,
        subject: dto.subject,
      },
    });
  }

  async findAll(filters: {
    category?: string;
    classLevel?: string;
    subject?: string;
    search?: string;
  }) {
    const where: any = {};

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.classLevel && filters.classLevel !== 'All Classes') {
      where.classLevel = filters.classLevel;
    }

    if (filters.subject) {
      where.subject = { contains: filters.subject };
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search } },
        { description: { contains: filters.search } },
        { subject: { contains: filters.search } },
      ];
    }

    return this.prisma.studyMaterial.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const material = await this.prisma.studyMaterial.findUnique({
      where: { id },
    });
    if (!material) {
      throw new NotFoundException('Study material not found');
    }
    return material;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.studyMaterial.delete({
      where: { id },
    });
  }

  async incrementDownload(id: string) {
    await this.findOne(id);
    return this.prisma.studyMaterial.update({
      where: { id },
      data: {
        downloadCount: {
          increment: 1,
        },
      },
    });
  }
}
