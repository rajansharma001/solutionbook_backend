import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BookmarksService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserBookmarks(userId: string) {
    return this.prisma.bookmark.findMany({
      where: { userId },
      include: {
        lesson: {
          select: { id: true, title: true, courseId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createBookmark(
    userId: string,
    dto: {
      lessonId: string;
      timestamp: number;
      note?: string;
    },
  ) {
    return this.prisma.bookmark.create({
      data: {
        userId,
        lessonId: dto.lessonId,
        timestamp: dto.timestamp,
        note: dto.note ?? null,
      },
    });
  }

  async deleteBookmark(id: string, userId: string) {
    const bookmark = await this.prisma.bookmark.findUnique({ where: { id } });
    if (!bookmark || bookmark.userId !== userId) {
      throw new NotFoundException('Bookmark not found');
    }
    return this.prisma.bookmark.delete({ where: { id } });
  }
}
