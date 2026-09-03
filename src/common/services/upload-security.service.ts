import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';
import { ClamavService } from './clamav.service';
import * as fs from 'fs';

export interface UploadQuotaConfig {
  dailyLimitBytes: number;
  monthlyLimitBytes: number;
}

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  remainingDaily: number;
  remainingMonthly: number;
}

@Injectable()
export class UploadSecurityService {
  private readonly logger = new Logger(UploadSecurityService.name);

  private readonly ROLE_LIMITS: Record<string, UploadQuotaConfig> = {
    STUDENT: {
      dailyLimitBytes: 50 * 1024 * 1024,
      monthlyLimitBytes: 500 * 1024 * 1024,
    },
    TEACHER: {
      dailyLimitBytes: 500 * 1024 * 1024,
      monthlyLimitBytes: 5 * 1024 * 1024 * 1024,
    },
    ADMIN: {
      dailyLimitBytes: 5 * 1024 * 1024 * 1024,
      monthlyLimitBytes: 50 * 1024 * 1024 * 1024,
    },
  };

  private readonly DEFAULT_LIMITS: UploadQuotaConfig = {
    dailyLimitBytes: 10 * 1024 * 1024,
    monthlyLimitBytes: 100 * 1024 * 1024,
  };

  constructor(
    private readonly redis: RedisService,
    private readonly clamav: ClamavService,
    private readonly config: ConfigService,
  ) {}

  async checkQuota(
    userId: string,
    role: string,
    additionalBytes: number,
  ): Promise<QuotaCheckResult> {
    const limits = this.ROLE_LIMITS[role] || this.DEFAULT_LIMITS;
    const now = new Date();
    const dayKey = now.toISOString().split('T')[0];
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const dailyUsed = await this.getUsage(userId, `daily:${dayKey}`);
    const monthlyUsed = await this.getUsage(userId, `monthly:${monthKey}`);

    const remainingDaily = Math.max(0, limits.dailyLimitBytes - dailyUsed);
    const remainingMonthly = Math.max(
      0,
      limits.monthlyLimitBytes - monthlyUsed,
    );

    if (additionalBytes > remainingDaily) {
      return {
        allowed: false,
        reason: `Daily upload limit exceeded. Remaining: ${this.formatBytes(remainingDaily)}`,
        remainingDaily,
        remainingMonthly,
      };
    }

    if (additionalBytes > remainingMonthly) {
      return {
        allowed: false,
        reason: `Monthly upload limit exceeded. Remaining: ${this.formatBytes(remainingMonthly)}`,
        remainingDaily,
        remainingMonthly,
      };
    }

    return { allowed: true, remainingDaily, remainingMonthly };
  }

  private async getUsage(userId: string, periodKey: string): Promise<number> {
    const key = `upload:quota:${userId}:${periodKey}`;
    const value = await this.redis.get(key);
    return value ? parseInt(value, 10) : 0;
  }

  async incrementUsage(userId: string, bytes: number): Promise<void> {
    const now = new Date();
    const dayKey = now.toISOString().split('T')[0];
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const dailyKey = `upload:quota:${userId}:daily:${dayKey}`;
    const monthlyKey = `upload:quota:${userId}:monthly:${monthKey}`;

    const ttlSeconds = 86400 * 32;

    await Promise.all([
      this.redis.getClient().incrby(dailyKey, bytes),
      this.redis.getClient().incrby(monthlyKey, bytes),
      this.redis.getClient().expire(dailyKey, ttlSeconds),
      this.redis.getClient().expire(monthlyKey, ttlSeconds),
    ]);
  }

  async scanAndValidateFile(filePath: string, mimeType: string): Promise<void> {
    const result = await this.clamav.scanFile(filePath);
    if (!result.clean) {
      this.logger.warn(`Virus detected in ${filePath}: ${result.threat}`);
      try {
        fs.unlinkSync(filePath);
      } catch {
        /* ignore */
      }
      throw new Error(`File rejected: malware detected (${result.threat})`);
    }

    if (!this.isAllowedMimeType(mimeType)) {
      try {
        fs.unlinkSync(filePath);
      } catch {
        /* ignore */
      }
      throw new Error(`File type not allowed: ${mimeType}`);
    }
  }

  private isAllowedMimeType(mimeType: string): boolean {
    const allowed = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'application/pdf',
      'video/mp4',
      'video/webm',
    ];
    return allowed.includes(mimeType);
  }

  private formatBytes(bytes: number): string {
    if (bytes >= 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${bytes} B`;
  }

  validateMagicBytes(
    filePath: string,
    expectedMime: string,
  ): boolean {
    try {
      const fd = fs.openSync(filePath, 'r');
      const buf = Buffer.alloc(16);
      fs.readSync(fd, buf, 0, 16, 0);
      fs.closeSync(fd);

      // SVG is text-based; check for <svg tag instead
      if (expectedMime === 'image/svg+xml') {
        const text = buf.toString('ascii').toLowerCase();
        return text.includes('<svg') || text.startsWith('<?xml');
      }

      // WebM magic bytes: 0x1A 0x45 0xDF 0xA3
      if (expectedMime === 'video/webm') {
        return (
          buf[0] === 0x1a &&
          buf[1] === 0x45 &&
          buf[2] === 0xdf &&
          buf[3] === 0xa3
        );
      }

      // Magic byte signatures
      const signatures: Record<string, { offset: number; bytes: Buffer }> = {
        'image/jpeg': { offset: 0, bytes: Buffer.from([0xff, 0xd8, 0xff]) },
        'image/png': {
          offset: 0,
          bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
        },
        'image/gif': {
          offset: 0,
          bytes: Buffer.from([0x47, 0x49, 0x46, 0x38]),
        },
        'image/webp': {
          offset: 8,
          bytes: Buffer.from([0x57, 0x45, 0x42, 0x50]),
        },
        'application/pdf': {
          offset: 0,
          bytes: Buffer.from([0x25, 0x50, 0x44, 0x46]),
        },
        'video/mp4': {
          offset: 4,
          bytes: Buffer.from([0x66, 0x74, 0x79, 0x70]),
        },
      };

      const sig = signatures[expectedMime];
      if (!sig) return false;

      const slice = buf.slice(sig.offset, sig.offset + sig.bytes.length);
      return slice.equals(sig.bytes);
    } catch {
      return false;
    }
  }
}
