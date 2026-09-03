import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdvancedRateLimitService } from '../services/advanced-rate-limit.service';

export const SKIP_RATE_LIMIT = 'skipRateLimit';

@Injectable()
export class AdaptiveThrottleGuard implements CanActivate {
  private readonly logger = new Logger(AdaptiveThrottleGuard.name);

  constructor(
    private readonly rateLimitService: AdvancedRateLimitService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_RATE_LIMIT, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const ip = this.getClientIp(request);
    const user = request.user;
    const path = request.route?.path || request.url;
    const method = request.method;

    const { allowed, results } = await this.rateLimitService.checkTieredLimit(
      ip,
      user?.sub,
      user?.role,
      path,
      method,
    );

    // Add rate limit headers to response
    const response = context.switchToHttp().getResponse();
    const mostRestrictive = results.reduce(
      (min: (typeof results)[0], r: (typeof results)[0]) =>
        r.remaining < min.remaining ? r : min,
      results[0],
    );
    this.setRateLimitHeaders(response, mostRestrictive);

    if (!allowed) {
      await this.rateLimitService.recordViolation(ip, user?.sub);
      this.logger.warn(
        `Rate limit exceeded for ${ip} (${user?.sub || 'anonymous'}) on ${method} ${path}`,
      );

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please slow down.',
          retryAfter: Math.ceil(
            (mostRestrictive.resetTime - Date.now()) / 1000,
          ),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private getClientIp(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.headers['x-real-ip'] ||
      request.socket?.remoteAddress ||
      request.ip ||
      'unknown'
    );
  }

  private setRateLimitHeaders(response: any, result: any): void {
    response.setHeader(
      'X-RateLimit-Limit',
      result.remaining + (result.allowed ? 1 : 0),
    );
    response.setHeader('X-RateLimit-Remaining', result.remaining);
    response.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));
  }
}

export const SkipRateLimit = () => (target: any, key?: string) => {
  if (key) {
    Reflect.defineMetadata(SKIP_RATE_LIMIT, true, target[key]);
  } else {
    Reflect.defineMetadata(SKIP_RATE_LIMIT, true, target);
  }
};
