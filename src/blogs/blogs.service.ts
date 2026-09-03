import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class BlogsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllCategories() {
    return this.prisma.blogCategory.findMany();
  }

  async getPublishedPosts() {
    return this.prisma.blogPost.findMany({
      where: { published: true },
      include: {
        category: true,
        author: {
          select: {
            id: true,
            name: true,
            profileImage: true,
            profileData: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPostBySlug(slug: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { slug },
      include: {
        category: true,
        author: {
          select: {
            id: true,
            name: true,
            profileImage: true,
            profileData: true,
          },
        },
      },
    });

    if (!post) throw new NotFoundException('Blog post not found');
    return post;
  }

  // Admin Methods

  async getAllPostsAdmin() {
    return this.prisma.blogPost.findMany({
      include: {
        category: true,
        author: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPost(authorId: string, data: { title: string; excerpt?: string; content: string; thumbnail?: string; published?: boolean; categoryId?: string; tags?: string[] }) {
    let slug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    // Ensure slug is unique
    const existing = await this.prisma.blogPost.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    return this.prisma.blogPost.create({
      data: {
        title: data.title,
        slug,
        excerpt: data.excerpt,
        content: data.content,
        thumbnail: data.thumbnail,
        published: data.published ?? false,
        authorId,
        categoryId: data.categoryId || null,
        tags: data.tags ? JSON.stringify(data.tags) : '[]',
      },
    });
  }

  async updatePost(id: string, data: { title?: string; excerpt?: string; content?: string; thumbnail?: string; published?: boolean; categoryId?: string; tags?: string[] }) {
    const post = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');

    let slug = data.title
      ? data.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '')
      : post.slug;

    if (data.title && slug !== post.slug) {
      const existing = await this.prisma.blogPost.findUnique({
        where: { slug },
      });
      if (existing) slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    return this.prisma.blogPost.update({
      where: { id },
      data: {
        title: data.title,
        slug,
        excerpt: data.excerpt,
        content: data.content,
        thumbnail: data.thumbnail,
        published: data.published,
        categoryId: data.categoryId,
        tags: data.tags ? JSON.stringify(data.tags) : undefined,
      },
    });
  }

  async deletePost(id: string) {
    return this.prisma.blogPost.delete({ where: { id } });
  }

  async createCategory(data: { name: string; description?: string }) {
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    return this.prisma.blogCategory.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
      },
    });
  }

  async deleteCategory(id: string) {
    return this.prisma.blogCategory.delete({ where: { id } });
  }
}
