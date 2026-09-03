import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);
  private readonly prefix = 'blacklist:';

  constructor(private readonly redis: RedisService) {}

  async add(jti: string, ttlSeconds: number): Promise<void> {
    const key = `${this.prefix}${jti}`;
    await this.redis.getClient().set(key, '1', 'EX', ttlSeconds);
    this.logger.debug(`Added token to blacklist: ${jti} (TTL: ${ttlSeconds}s)`);
  }

  async isBlacklisted(jti: string): Promise<boolean> {
    const key = `${this.prefix}${jti}`;
    return (await this.redis.getClient().exists(key)) === 1;
  }

  async remove(jti: string): Promise<void> {
    const key = `${this.prefix}${jti}`;
    await this.redis.getClient().del(key);
    this.logger.debug(`Removed token from blacklist: ${jti}`);
  }

  async addMultiple(jtis: string[], ttlSeconds: number): Promise<void> {
    if (jtis.length === 0) return;
    const pipeline = this.redis.getClient().pipeline();
    for (const jti of jtis) {
      pipeline.set(`${this.prefix}${jti}`, '1', 'EX', ttlSeconds);
    }
    await pipeline.exec();
    this.logger.debug(`Added ${jtis.length} tokens to blacklist`);
  }

  async getRemainingTtl(jti: string): Promise<number> {
    const key = `${this.prefix}${jti}`;
    return this.redis.getClient().ttl(key);
  }
}