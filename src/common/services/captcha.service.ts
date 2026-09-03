import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';

export interface CaptchaChallenge {
  id: string;
  answer: string;
  expiresAt: number;
  type: 'math' | 'text';
}

@Injectable()
export class CaptchaService {
  private readonly logger = new Logger(CaptchaService.name);
  private readonly enabled: boolean;
  private readonly ttlSeconds: number;

  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {
    this.enabled = this.config.get<string>('CAPTCHA_ENABLED') === 'true';
    this.ttlSeconds = this.config.get<number>('CAPTCHA_TTL_SECONDS') || 300; // 5 min
  }

  async generateChallenge(ip: string): Promise<CaptchaChallenge | null> {
    if (!this.enabled) {
      return null;
    }

    const type = Math.random() > 0.5 ? 'math' : 'text';
    let answer: string;

    if (type === 'math') {
      const a = Math.floor(Math.random() * 10) + 1;
      const b = Math.floor(Math.random() * 10) + 1;
      const op = Math.random() > 0.5 ? '+' : '-';
      answer = op === '+' ? String(a + b) : String(a - b);
    } else {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      answer = Array.from(
        { length: 5 },
        () => chars[Math.floor(Math.random() * chars.length)],
      ).join('');
    }

    const challenge: CaptchaChallenge = {
      id: `captcha:${ip}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
      answer: answer.toLowerCase(),
      expiresAt: Date.now() + this.ttlSeconds * 1000,
      type,
    };

    await this.redis.set(
      challenge.id,
      JSON.stringify(challenge),
      this.ttlSeconds,
    );

    return challenge;
  }

  async verifyChallenge(
    challengeId: string,
    userAnswer: string,
  ): Promise<boolean> {
    if (!this.enabled) {
      return true;
    }

    const data = await this.redis.get(challengeId);
    if (!data) {
      return false;
    }

    const challenge = JSON.parse(data) as CaptchaChallenge;

    // Check expiry
    if (Date.now() > challenge.expiresAt) {
      await this.redis.del(challengeId);
      return false;
    }

    // Verify answer (case-insensitive)
    const isValid = challenge.answer === userAnswer.toLowerCase().trim();

    // Delete challenge after use (one-time)
    await this.redis.del(challengeId);

    return isValid;
  }

  async shouldRequireCaptcha(ip: string, userId?: string): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    const failureKey = `auth:failures:ip:${ip}`;
    const failures = await this.redis.getClient().get(failureKey);
    const failureCount = failures ? parseInt(failures, 10) : 0;

    // Require CAPTCHA after 3 failed attempts
    if (failureCount >= 3) {
      return true;
    }

    // Also check user-specific failures if authenticated
    if (userId) {
      const userFailureKey = `auth:failures:user:${userId}`;
      const userFailures = await this.redis.getClient().get(userFailureKey);
      const userFailureCount = userFailures ? parseInt(userFailures, 10) : 0;
      if (userFailureCount >= 3) {
        return true;
      }
    }

    return false;
  }

  async recordAuthFailure(ip: string, userId?: string): Promise<void> {
    const failureKey = `auth:failures:ip:${ip}`;
    const pipe = this.redis.getClient().pipeline();
    pipe.incr(failureKey);
    pipe.expire(failureKey, 3600); // 1 hour
    await pipe.exec();

    if (userId) {
      const userFailureKey = `auth:failures:user:${userId}`;
      const userPipe = this.redis.getClient().pipeline();
      userPipe.incr(userFailureKey);
      userPipe.expire(userFailureKey, 3600);
      await userPipe.exec();
    }
  }

  async clearAuthFailures(ip: string, userId?: string): Promise<void> {
    await this.redis.del(`auth:failures:ip:${ip}`);
    if (userId) {
      await this.redis.del(`auth:failures:user:${userId}`);
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
