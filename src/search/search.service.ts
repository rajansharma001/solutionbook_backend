import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async globalSearch(query: string) {
    if (!query || query.trim().length < 2) {
      return { courses: [], lessons: [] };
    }

    const courses = await this.prisma.course.findMany({
      where: {
        OR: [
          { title: { contains: query } },
          { description: { contains: query } },
          { category: { contains: query } },
        ],
      },
      take: 10,
      select: {
        id: true,
        title: true,
        slug: true,
        category: true,
        level: true,
        price: true,
        thumbnail: true,
      },
    });

    const lessons = await this.prisma.lesson.findMany({
      where: {
        OR: [{ title: { contains: query } }, { content: { contains: query } }],
      },
      take: 10,
      select: {
        id: true,
        title: true,
        lessonType: true,
        course: {
          select: {
            title: true,
            slug: true,
          },
        },
      },
    });

    return { courses, lessons };
  }
}
