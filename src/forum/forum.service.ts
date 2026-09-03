import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ForumService {
  constructor(private prisma: PrismaService) {}

  async getCategories(userId: string) {
    const categories = await this.prisma.forumCategory.findMany({
      include: {
        _count: {
          select: { posts: true, members: true },
        },
        members: {
          where: { userId },
          select: { id: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return categories.map((cat) => ({
      ...cat,
      requiredCourseIds: cat.requiredCourseIds ? JSON.parse(cat.requiredCourseIds) : [],
      isJoined: cat.members.length > 0,
    }));
  }

  async getCategoryBySlug(userId: string, slug: string) {
    const category = await this.prisma.forumCategory.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { members: true },
        },
        members: {
          where: { userId },
          select: { id: true },
        },
        posts: {
          orderBy: { createdAt: 'desc' },
          include: {
            author: { select: { id: true, name: true, profileImage: true } },
            _count: { select: { comments: true } },
          },
        },
      },
    });

    if (!category) throw new NotFoundException('Category not found');

    return {
      ...category,
      requiredCourseIds: category.requiredCourseIds ? JSON.parse(category.requiredCourseIds) : [],
      isJoined: category.members.length > 0,
    };
  }

  async createCategory(userId: string, data: { name: string; description?: string; icon?: string; isPrivate?: boolean; requiredCourseIds?: string[] }) {
    // Generate a simple slug
    const baseSlug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    let slug = baseSlug;
    let counter = 1;

    // Ensure unique slug
    while (await this.prisma.forumCategory.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return this.prisma.forumCategory.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        icon: data.icon,
        isPrivate: data.isPrivate || false,
        requiredCourseIds: data.requiredCourseIds ? JSON.stringify(data.requiredCourseIds) : '[]',
        ownerId: userId,
        members: {
          create: { userId } // Owner automatically joins
        }
      },
    });
  }

  async joinCategory(userId: string, categoryId: string) {
    const category = await this.prisma.forumCategory.findUnique({ where: { id: categoryId } });
    if (!category) throw new NotFoundException('Category not found');

    if (category.isPrivate && category.requiredCourseIds !== '[]') {
      const requiredCourseIds = JSON.parse(category.requiredCourseIds) as string[];
      if (requiredCourseIds.length > 0) {
        // Check if user has an active enrollment in any of the required courses
        const enrollments = await this.prisma.enrollment.findFirst({
          where: {
            studentId: userId,
            courseId: { in: requiredCourseIds },
            paymentStatus: 'PAID'
          }
        });

        if (!enrollments) {
          throw new ForbiddenException('You must purchase a required course to join this private community.');
        }
      }
    }

    try {
      await this.prisma.forumCategoryMember.create({
        data: { categoryId, userId }
      });
    } catch (error) {
      // Ignore unique constraint violation if already joined
    }

    return { success: true };
  }

  async leaveCategory(userId: string, categoryId: string) {
    const membership = await this.prisma.forumCategoryMember.findUnique({
      where: {
        categoryId_userId: { categoryId, userId }
      }
    });

    if (membership) {
      await this.prisma.forumCategoryMember.delete({
        where: { id: membership.id }
      });
    }

    return { success: true };
  }

  async getPost(postId: string) {
    const post = await this.prisma.forumPost.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: { id: true, name: true, profileImage: true, role: true },
        },
        category: true,
        comments: {
          where: { parentId: null }, // Only fetch top-level comments
          orderBy: { upvotes: 'desc' },
          include: {
            author: {
              select: { id: true, name: true, profileImage: true, role: true },
            },
            replies: {
              orderBy: { createdAt: 'asc' },
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    profileImage: true,
                    role: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!post) throw new NotFoundException('Post not found');

    // Increment views
    await this.prisma.forumPost.update({
      where: { id: postId },
      data: { views: { increment: 1 } },
    });

    return post;
  }

  async createPost(
    userId: string,
    data: {
      title: string;
      content: string;
      categoryId: string;
      courseId?: string;
    },
  ) {
    return this.prisma.forumPost.create({
      data: {
        title: data.title,
        content: data.content,
        categoryId: data.categoryId,
        authorId: userId,
        courseId: data.courseId,
      },
    });
  }

  async addComment(
    userId: string,
    postId: string,
    data: { content: string; parentId?: string },
  ) {
    // Basic check for parent existence if provided
    if (data.parentId) {
      const parent = await this.prisma.forumComment.findUnique({
        where: { id: data.parentId },
      });
      if (!parent) throw new NotFoundException('Parent comment not found');
      if (parent.parentId)
        throw new BadRequestException('Only one level of nesting is allowed');
    }

    return this.prisma.forumComment.create({
      data: {
        content: data.content,
        postId,
        authorId: userId,
        parentId: data.parentId || null,
      },
      include: {
        author: {
          select: { id: true, name: true, profileImage: true, role: true },
        },
      },
    });
  }

  async upvotePost(userId: string, postId: string) {
    const existing = await this.prisma.forumLike.findFirst({
      where: { userId, postId },
    });

    if (existing) {
      // Remove upvote
      await this.prisma.forumLike.delete({ where: { id: existing.id } });
      await this.prisma.forumPost.update({
        where: { id: postId },
        data: { upvotes: { decrement: 1 } },
      });
      return { status: 'removed' };
    } else {
      // Add upvote
      await this.prisma.forumLike.create({ data: { userId, postId } });
      await this.prisma.forumPost.update({
        where: { id: postId },
        data: { upvotes: { increment: 1 } },
      });
      return { status: 'added' };
    }
  }

  async upvoteComment(userId: string, commentId: string) {
    const existing = await this.prisma.forumLike.findFirst({
      where: { userId, commentId },
    });

    if (existing) {
      // Remove upvote
      await this.prisma.forumLike.delete({ where: { id: existing.id } });
      await this.prisma.forumComment.update({
        where: { id: commentId },
        data: { upvotes: { decrement: 1 } },
      });
      return { status: 'removed' };
    } else {
      // Add upvote
      await this.prisma.forumLike.create({ data: { userId, commentId } });
      await this.prisma.forumComment.update({
        where: { id: commentId },
        data: { upvotes: { increment: 1 } },
      });
      return { status: 'added' };
    }
  }
}
