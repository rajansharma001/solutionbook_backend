import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Repository, PaginatedResult } from './base.repository';

export interface CourseRecord {
  id: string;
  title: string;
  status: string;
  adminVerified: boolean;
  price: number;
  teacherId: string;
  category: string;
  createdAt: Date;
}

export interface CourseFilters {
  status?: string;
  page?: number;
  limit?: number;
}

export interface ICourseRepository extends Repository<CourseRecord> {
  findAll(filters: CourseFilters): Promise<PaginatedResult<CourseRecord>>;
  approve(id: string): Promise<CourseRecord>;
  reject(id: string, reason?: string): Promise<CourseRecord>;
  delete(id: string): Promise<void>;
}

@Injectable()
export class CourseRepository implements ICourseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<CourseRecord | null> {
    const course = await this.prisma.course.findUnique({ where: { id } });
    return course as unknown as CourseRecord | null;
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.course.count({ where: { id } });
    return count > 0;
  }

  async count(): Promise<number> {
    return this.prisma.course.count();
  }

  async findAll(filters: CourseFilters): Promise<PaginatedResult<CourseRecord>> {
    const { status, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;
    const where = status && status !== 'ALL' ? { status } : undefined;

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          teacher: { select: { id: true, email: true, profileData: true } },
          _count: { select: { enrollments: true, modules: true } },
        },
      }),
      this.prisma.course.count({ where }),
    ]);

    const data = courses.map(c => ({
      id: c.id, title: c.title, status: c.status,
      adminVerified: c.adminVerified, price: c.price,
      teacherId: c.teacherId, category: c.category, createdAt: c.createdAt,
    }));

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async approve(id: string): Promise<CourseRecord> {
    const course = await this.prisma.course.update({
      where: { id },
      data: { adminVerified: true, status: 'PUBLISHED' },
    });
    return course as unknown as CourseRecord;
  }

  async reject(id: string, _reason?: string): Promise<CourseRecord> {
    const course = await this.prisma.course.update({
      where: { id },
      data: { status: 'REJECTED', adminVerified: false },
    });
    return course as unknown as CourseRecord;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.course.delete({ where: { id } });
  }
}
