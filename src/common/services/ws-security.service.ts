import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

const WS_CONN_MAX_PER_USER = 5;
const WS_CONN_MAX_PER_IP = 20;
const WS_MSG_SIZE_MAX = 100_000;
const RATE_LIMIT_WINDOW_MS = 10_000;
const RATE_LIMIT_MAX_EVENTS = 30;
const RATE_LIMIT_MAX_EVENTS_HEAVY = 10;

@Injectable()
export class WsSecurityService {
  private readonly logger = new Logger(WsSecurityService.name);

  constructor(private readonly redis: RedisService) {}

  async checkConnectionAllowed(
    ip: string,
    userId: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const count = await this.redis.addWsConnection(ip, userId);
    if (count > WS_CONN_MAX_PER_USER) {
      await this.redis.removeWsConnection(ip, userId);
      return {
        allowed: false,
        reason: 'Maximum connections per user exceeded',
      };
    }

    const { ip: ipCount } = await this.redis.getWsConnections(ip, userId);
    if (ipCount > WS_CONN_MAX_PER_IP) {
      await this.redis.removeWsConnection(ip, userId);
      return { allowed: false, reason: 'Maximum connections per IP exceeded' };
    }

    return { allowed: true };
  }

  async removeConnection(ip: string, userId: string): Promise<void> {
    await this.redis.removeWsConnection(ip, userId);
  }

  validateMessageSize(data: unknown): boolean {
    const size = new TextEncoder().encode(JSON.stringify(data)).length;
    return size <= WS_MSG_SIZE_MAX;
  }

  async checkRateLimit(
    userId: string,
    event: string,
    heavy = false,
  ): Promise<{ allowed: boolean; remaining: number }> {
    const key = `ws:ratelimit:${userId}:${event}`;
    const limit = heavy ? RATE_LIMIT_MAX_EVENTS_HEAVY : RATE_LIMIT_MAX_EVENTS;
    const { remaining } = await this.redis.slidingWindowIncrement(
      key,
      RATE_LIMIT_WINDOW_MS,
      limit,
    );
    return { allowed: remaining >= 0, remaining };
  }
}
