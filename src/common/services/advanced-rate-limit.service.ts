import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { ConfigService } from '@nestjs/config';

export interface RateLimitTier {
  name: string;
  limit: number;
  windowMs: number;
  keyPrefix: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  tier: string;
}

export interface TieredRateLimitConfig {
  tiers: RateLimitTier[];
  skipPaths?: string[];
  skipIpRanges?: string[];
}

@Injectable()
export class AdvancedRateLimitService {
  private readonly logger = new Logger(AdvancedRateLimitService.name);
  private readonly config: TieredRateLimitConfig;

  constructor(
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.config = {
      tiers: [
        {
          name: 'auth-strict',
          limit: this.configService.get<number>('RATE_LIMIT_AUTH_STRICT') || 5,
          windowMs: 15 * 60 * 1000,
          keyPrefix: 'ratelimit:auth',
        },
        {
          name: 'auth-standard',
          limit:
            this.configService.get<number>('RATE_LIMIT_AUTH_STANDARD') || 20,
          windowMs: 15 * 60 * 1000,
          keyPrefix: 'ratelimit:auth',
        },
        {
          name: 'api-standard',
          limit:
            this.configService.get<number>('RATE_LIMIT_API_STANDARD') || 100,
          windowMs: 60 * 1000,
          keyPrefix: 'ratelimit:api',
        },
        {
          name: 'api-authenticated',
          limit: this.configService.get<number>('RATE_LIMIT_API_AUTH') || 300,
          windowMs: 60 * 1000,
          keyPrefix: 'ratelimit:api',
        },
        {
          name: 'api-admin',
          limit: this.configService.get<number>('RATE_LIMIT_API_ADMIN') || 1000,
          windowMs: 60 * 1000,
          keyPrefix: 'ratelimit:api',
        },
        {
          name: 'upload',
          limit: this.configService.get<number>('RATE_LIMIT_UPLOAD') || 10,
          windowMs: 60 * 1000,
          keyPrefix: 'ratelimit:upload',
        },
        {
          name: 'search',
          limit: this.configService.get<number>('RATE_LIMIT_SEARCH') || 30,
          windowMs: 60 * 1000,
          keyPrefix: 'ratelimit:search',
        },
        {
          name: 'websocket',
          limit: this.configService.get<number>('RATE_LIMIT_WS') || 30,
          windowMs: 10 * 1000,
          keyPrefix: 'ratelimit:ws',
        },
      ],
      skipPaths: ['/health', '/ready', '/metrics'],
      skipIpRanges: [],
    };
  }

  async checkLimit(
    identifier: string,
    tierName: string,
    customLimit?: number,
    customWindowMs?: number,
  ): Promise<RateLimitResult> {
    const tier = this.config.tiers.find((t) => t.name === tierName);
    if (!tier) {
      throw new Error(`Rate limit tier '${tierName}' not found`);
    }

    const limit = customLimit ?? tier.limit;
    const windowMs = customWindowMs ?? tier.windowMs;
    const key = `${tier.keyPrefix}:${identifier}`;

    const result = await this.redis.slidingWindowIncrement(
      key,
      windowMs,
      limit,
    );

    return {
      allowed: result.remaining >= 0,
      remaining: result.remaining,
      resetTime: result.resetTime,
      tier: tierName,
    };
  }

  async checkTieredLimit(
    ip: string,
    userId: string | undefined,
    role: string | undefined,
    path: string,
    method: string,
  ): Promise<{ allowed: boolean; results: RateLimitResult[] }> {
    const tierName = this.getTierForRequest(path, method, role, !!userId);
    const results: RateLimitResult[] = [];

    // IP-based limit
    const ipResult = await this.checkLimit(`ip:${ip}`, tierName);
    results.push(ipResult);

    // User-based limit (if authenticated)
    if (userId) {
      const userResult = await this.checkLimit(`user:${userId}`, tierName);
      results.push(userResult);
    }

    // Endpoint-specific limit
    const endpointKey = `${method}:${path}`;
    const endpointResult = await this.checkLimit(
      `endpoint:${endpointKey}`,
      tierName,
    );
    results.push(endpointResult);

    const allowed = results.every((r) => r.allowed);
    return { allowed, results };
  }

  private getTierForRequest(
    path: string,
    method: string,
    role?: string,
    isAuthenticated?: boolean,
  ): string {
    // Auth endpoints - strictest limits
    if (path.startsWith('/auth/')) {
      return 'auth-strict';
    }

    // Upload endpoints
    if (
      path.startsWith('/media/upload') ||
      path.startsWith('/courses/upload')
    ) {
      return 'upload';
    }

    // Search endpoints
    if (path.includes('/search') || path.includes('/filter')) {
      return 'search';
    }

    // Admin endpoints
    if (path.startsWith('/admin/')) {
      return 'api-admin';
    }

    // Authenticated API
    if (isAuthenticated) {
      return 'api-authenticated';
    }

    return 'api-standard';
  }

  async recordViolation(ip: string, userId: string | undefined): Promise<void> {
    const key = `ratelimit:violations:ip:${ip}`;
    const count = await this.redis.incrementWithTTL(key, 86400); // 24h window

    if (count > 10) {
      this.logger.warn(
        `High violation count for IP ${ip}: ${count} violations in 24h`,
      );
    }

    if (userId) {
      const userKey = `ratelimit:violations:user:${userId}`;
      await this.redis.incrementWithTTL(userKey, 86400);
    }
  }

  async getViolationCount(ip: string): Promise<number> {
    const key = `ratelimit:violations:ip:${ip}`;
    const value = await this.redis.get(key);
    return value ? parseInt(value, 10) : 0;
  }

  async isIpBlocked(ip: string): Promise<boolean> {
    const violations = await this.getViolationCount(ip);
    return violations > 50; // Block after 50 violations in 24h
  }

  async resetIpViolations(ip: string): Promise<void> {
    const key = `ratelimit:violations:ip:${ip}`;
    await this.redis.del(key);
  }
}
