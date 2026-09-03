import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import { join } from 'path';

@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllMedia() {
    return this.prisma.mediaAsset.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUserMedia(userId: string) {
    return this.prisma.mediaAsset.findMany({
      where: { uploadedById: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMediaByHash(uploadedById: string, hash: string) {
    return this.prisma.mediaAsset.findFirst({
      where: { uploadedById, hash },
    });
  }

  async createMediaRecord(
    uploadedById: string,
    dto: {
      filename: string;
      originalName: string;
      url: string;
      mimeType: string;
      size: number;
      hash?: string;
    },
  ) {
    return this.prisma.mediaAsset.create({
      data: {
        filename: dto.filename,
        originalName: dto.originalName,
        url: dto.url,
        mimeType: dto.mimeType,
        size: dto.size,
        hash: dto.hash,
        uploadedById,
      },
    });
  }

  async getMediaById(id: string) {
    return this.prisma.mediaAsset.findUnique({ where: { id } });
  }

  async updateMedia(id: string, dto: { originalName: string }) {
    return this.prisma.mediaAsset.update({
      where: { id },
      data: { originalName: dto.originalName },
    });
  }

  async deleteMedia(id: string) {
    const media = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!media) throw new NotFoundException('Media not found');

    try {
      // media.url is e.g. /uploads/users/userId/xyz.jpg
      const urlPath = media.url.startsWith('/')
        ? media.url.substring(1)
        : media.url;
      const filePath = join(process.cwd(), urlPath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error('Failed to physically delete file', err);
    }

    return this.prisma.mediaAsset.delete({ where: { id } });
  }
}
