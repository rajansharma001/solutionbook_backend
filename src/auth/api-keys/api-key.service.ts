import { Injectable, ConflictException, NotFoundException, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'bcrypt';
import { randomBytes } from 'crypto';

const KEY_PREFIX_LENGTH = 8;
const KEY_BYTES = 32;

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createApiKey(name: string, scopes: string[] = [], createdBy?: string, expiresAt?: Date): Promise<{ apiKey: string; id: string }> {
    const rawKey = `sb_${randomBytes(KEY_BYTES).toString('hex')}`;
    const keyPrefix = rawKey.substring(0, KEY_PREFIX_LENGTH);
    const keyHash = await crypto.hash(rawKey, 10);

    const record = await this.prisma.apiKey.create({
      data: {
        name,
        keyHash,
        keyPrefix,
        scopes: JSON.stringify(scopes),
        createdBy,
        expiresAt,
      },
    });

    return { apiKey: rawKey, id: record.id };
  }

  async validateApiKey(apiKey: string): Promise<{ id: string; name: string; scopes: string[] }> {
    const keyPrefix = apiKey.substring(0, KEY_PREFIX_LENGTH);
    const candidates = await this.prisma.apiKey.findMany({
      where: { keyPrefix, isActive: true },
    });

    for (const candidate of candidates) {
      const isValid = await crypto.compare(apiKey, candidate.keyHash);
      if (isValid) {
        if (candidate.expiresAt && candidate.expiresAt < new Date()) {
          throw new UnauthorizedException('API key has expired');
        }

        await this.prisma.apiKey.update({
          where: { id: candidate.id },
          data: { lastUsedAt: new Date() },
        });

        return {
          id: candidate.id,
          name: candidate.name,
          scopes: JSON.parse(candidate.scopes),
        };
      }
    }

    throw new UnauthorizedException('Invalid API key');
  }

  async listApiKeys(): Promise<Array<{ id: string; name: string; keyPrefix: string; isActive: boolean; scopes: string; lastUsedAt: Date | null; expiresAt: Date | null; createdAt: Date }>> {
    return this.prisma.apiKey.findMany({
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        isActive: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeApiKey(id: string): Promise<void> {
    const existing = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('API key not found');
    }
    await this.prisma.apiKey.update({
      where: { id },
      data: { isActive: false },
    });
    this.logger.log(`API key ${existing.name} (${id}) revoked`);
  }

  async deleteApiKey(id: string): Promise<void> {
    const existing = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('API key not found');
    }
    await this.prisma.apiKey.delete({ where: { id } });
    this.logger.log(`API key ${existing.name} (${id}) deleted`);
  }
}
