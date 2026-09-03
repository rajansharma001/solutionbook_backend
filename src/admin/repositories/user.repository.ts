import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Repository, PaginatedResult } from './base.repository';

export interface UserRecord {
  id: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  profileData: unknown;
  enrollmentsCount?: number;
  coursesTaughtCount?: number;
}

export interface UserFilters {
  search?: string;
  page?: number;
  limit?: number;
}

export interface IUserRepository extends Repository<UserRecord> {
  findAll(filters: UserFilters): Promise<PaginatedResult<UserRecord>>;
  updateRole(id: string, role: string): Promise<{ id: string; email: string; role: string }>;
  updateStatus(id: string, isActive: boolean): Promise<{ id: string; email: string; isActive: boolean }>;
  delete(id: string): Promise<void>;
}

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<UserRecord | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user as unknown as UserRecord | null;
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.user.count({ where: { id } });
    return count > 0;
  }

  async count(): Promise<number> {
    return this.prisma.user.count();
  }

  async findAll(filters: UserFilters): Promise<PaginatedResult<UserRecord>> {
    const { search, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;
    const where = search ? { OR: [{ email: { contains: search } }] } : undefined;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, role: true, isEmailVerified: true,
          isActive: true, createdAt: true, profileData: true,
          _count: { select: { enrollments: true, coursesTaught: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const data = users.map(u => ({
      ...u,
      enrollmentsCount: u._count.enrollments,
      coursesTaughtCount: u._count.coursesTaught,
    }));

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateRole(id: string, role: string) {
    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, role: true },
    });
  }

  async updateStatus(id: string, isActive: boolean) {
    return this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: { id: true, email: true, isActive: true },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}
