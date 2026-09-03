import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class AdminCacheService {
  private readonly logger = new Logger(AdminCacheService.name);
  private readonly prefix = 'admin:cache:';
  private readonly defaultTtl = 60;

  constructor(private readonly redis: RedisService) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(`${this.prefix}${key}`);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = this.defaultTtl): Promise<void> {
    try {
      await this.redis.set(`${this.prefix}${key}`, JSON.stringify(value), ttlSeconds);
    } catch (err) {
      this.logger.warn(`Cache set failed for key ${key}: ${(err as Error).message}`);
    }
  }

  async invalidate(key: string): Promise<void> {
    try {
      await this.redis.del(`${this.prefix}${key}`);
    } catch (err) {
      this.logger.warn(`Cache invalidate failed for key ${key}: ${(err as Error).message}`);
    }
  }

  async invalidateByPattern(pattern: string): Promise<void> {
    try {
      const client = (this.redis as any).getClient();
      let cursor = '0';
      const keysToDelete: string[] = [];
      do {
        const result = await client.scan(cursor, 'MATCH', `${this.prefix}${pattern}`, 'COUNT', '100');
        cursor = result[0];
        keysToDelete.push(...result[1]);
      } while (cursor !== '0');
      if (keysToDelete.length > 0) {
        await this.redis.del(keysToDelete);
      }
    } catch (err) {
      this.logger.warn(`Cache invalidation failed for pattern ${pattern}: ${(err as Error).message}`);
    }
  }

  async invalidateAll(): Promise<void> {
    await this.invalidateByPattern('*');
  }
}
