import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;
  private readonly isReady = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
    const maxRetriesPerRequest = 3;
    const retryStrategy = (times: number) => {
      if (times > 10) {
        this.logger.error('Redis connection failed after 10 retries');
        return null;
      }
      return Math.min(times * 100, 3000);
    };

    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest,
      retryStrategy,
      enableReadyCheck: true,
      lazyConnect: false,
      family: 4,
      connectTimeout: 10000,
      commandTimeout: 5000,
    });

    this.client.on('connect', () => {
      this.logger.log('Redis connected');
    });

    this.client.on('ready', () => {
      this.logger.log('Redis ready');
    });

    this.client.on('error', (err) => {
      this.logger.error(`Redis error: ${err.message}`);
    });

    this.client.on('close', () => {
      this.logger.warn('Redis connection closed');
    });

    this.client.on('reconnecting', () => {
      this.logger.log('Redis reconnecting...');
    });

    // Test connection
    try {
      await this.client.ping();
      this.logger.log('Redis ping successful');
    } catch (error) {
      this.logger.warn(`Redis ping failed: ${(error as Error).message}. Operating in fallback mode.`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
    this.logger.log('Redis connection closed');
  }

  getClient(): Redis {
    return this.client;
  }

  // ===== Key-Value Operations =====

  async set(key: string, value: string, ttlSeconds?: number): Promise<'OK' | null> {
    if (ttlSeconds) {
      return this.client.set(key, value, 'EX', ttlSeconds);
    }
    return this.client.set(key, value);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string | string[]): Promise<number> {
    return this.client.del(...(Array.isArray(key) ? key : [key]));
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1;
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    return (await this.client.expire(key, seconds)) === 1;
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  // ===== Hash Operations =====

  async hset(key: string, field: string, value: string): Promise<number> {
    return this.client.hset(key, field, value);
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.client.hget(key, field);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    return this.client.hdel(key, ...fields);
  }

  async hexists(key: string, field: string): Promise<boolean> {
    return (await this.client.hexists(key, field)) === 1;
  }

  // ===== Set Operations =====

  async sadd(key: string, ...members: string[]): Promise<number> {
    return this.client.sadd(key, ...members);
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    return this.client.srem(key, ...members);
  }

  async smembers(key: string): Promise<string[]> {
    return this.client.smembers(key);
  }

  async sismember(key: string, member: string): Promise<boolean> {
    return (await this.client.sismember(key, member)) === 1;
  }

  // ===== Sorted Set Operations =====

  async zadd(key: string, score: number, member: string): Promise<number> {
    return this.client.zadd(key, score, member);
  }

  async zrem(key: string, ...members: string[]): Promise<number> {
    return this.client.zrem(key, ...members);
  }

  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.client.zrange(key, start, stop);
  }

  async zrevrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.client.zrevrange(key, start, stop);
  }

  async zcount(key: string, min: number, max: number): Promise<number> {
    return this.client.zcount(key, min, max);
  }

  // ===== Rate Limiting Helpers =====

  async incrementWithTTL(key: string, ttlSeconds: number): Promise<number> {
    const multi = this.client.multi();
    multi.incr(key);
    multi.expire(key, ttlSeconds);
    const results = await multi.exec();
    return results?.[0]?.[1] as number ?? 0;
  }

  async slidingWindowIncrement(
    key: string,
    windowMs: number,
    limit: number,
  ): Promise<{ count: number; remaining: number; resetTime: number }> {
    const now = Date.now();
    const windowStart = now - windowMs;
    const pipeline = this.client.pipeline();

    // Remove expired entries
    pipeline.zremrangebyscore(key, 0, windowStart);
    // Count current entries
    pipeline.zcard(key);
    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    // Set expiry
    pipeline.expire(key, Math.ceil(windowMs / 1000) + 1);

    const results = await pipeline.exec();
    const count = (results?.[1]?.[1] as number) ?? 0;
    const remaining = Math.max(0, limit - count - 1);
    const resetTime = now + windowMs;

    return { count: count + 1, remaining, resetTime };
  }

  // ===== Token Blacklist Operations =====

  async addToBlacklist(tokenId: string, ttlSeconds: number): Promise<void> {
    await this.client.set(`blacklist:${tokenId}`, '1', 'EX', ttlSeconds);
  }

  async isBlacklisted(tokenId: string): Promise<boolean> {
    return (await this.client.exists(`blacklist:${tokenId}`)) === 1;
  }

  async removeFromBlacklist(tokenId: string): Promise<void> {
    await this.client.del(`blacklist:${tokenId}`);
  }

  // ===== Session Management =====

  async setSession(userId: string, sessionId: string, data: Record<string, unknown>, ttlSeconds: number): Promise<void> {
    const key = `session:${userId}:${sessionId}`;
    await this.client.set(key, JSON.stringify(data), 'EX', ttlSeconds);
  }

  async getSession(userId: string, sessionId: string): Promise<Record<string, unknown> | null> {
    const key = `session:${userId}:${sessionId}`;
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async deleteSession(userId: string, sessionId: string): Promise<void> {
    const key = `session:${userId}:${sessionId}`;
    await this.client.del(key);
  }

  async deleteAllUserSessions(userId: string): Promise<number> {
    const pattern = `session:${userId}:*`;
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      return this.client.del(...keys);
    }
    return 0;
  }

  // ===== Upload Quota =====

  async incrementUploadQuota(userId: string, bytes: number, ttlSeconds: number): Promise<number> {
    const key = `upload:quota:${userId}`;
    const current = await this.client.incrby(key, bytes);
    if (current === bytes) {
      await this.client.expire(key, ttlSeconds);
    }
    return current;
  }

  async getUploadQuota(userId: string): Promise<number> {
    const key = `upload:quota:${userId}`;
    const value = await this.client.get(key);
    return value ? parseInt(value, 10) : 0;
  }

  // ===== WebSocket Connection Tracking =====

  async addWsConnection(ip: string, userId: string): Promise<number> {
    const ipKey = `ws:conn:ip:${ip}`;
    const userKey = `ws:conn:user:${userId}`;
    const pipe = this.client.pipeline();
    pipe.incr(ipKey);
    pipe.incr(userKey);
    pipe.expire(ipKey, 3600);
    pipe.expire(userKey, 3600);
    const results = await pipe.exec();
    return (results?.[0]?.[1] as number) ?? 0;
  }

  async removeWsConnection(ip: string, userId: string): Promise<void> {
    const ipKey = `ws:conn:ip:${ip}`;
    const userKey = `ws:conn:user:${userId}`;
    const pipe = this.client.pipeline();
    pipe.decr(ipKey);
    pipe.decr(userKey);
    await pipe.exec();
  }

  async getWsConnections(ip: string, userId: string): Promise<{ ip: number; user: number }> {
    const ipKey = `ws:conn:ip:${ip}`;
    const userKey = `ws:conn:user:${userId}`;
    const [ipCount, userCount] = await Promise.all([
      this.client.get(ipKey),
      this.client.get(userKey),
    ]);
    return {
      ip: ipCount ? parseInt(ipCount, 10) : 0,
      user: userCount ? parseInt(userCount, 10) : 0,
    };
  }

  // ===== Health Check =====

  async healthCheck(): Promise<{ status: 'ok' | 'error'; latencyMs: number }> {
    const start = Date.now();
    try {
      await this.client.ping();
      return { status: 'ok', latencyMs: Date.now() - start };
    } catch {
      return { status: 'error', latencyMs: Date.now() - start };
    }
  }
}