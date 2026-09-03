import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { ThrottlerRequest } from '@nestjs/throttler';

@Injectable()
export class AuthenticatedThrottlerGuard extends ThrottlerGuard {
  protected async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    const { context, limit, ttl, throttler, blockDuration, getTracker, generateKey } = requestProps;
    const request = context.switchToHttp().getRequest();
    const isAuthenticated = request.headers?.authorization?.startsWith('Bearer ');

    const effectiveLimit = isAuthenticated ? limit * 2 : limit;

    return super.handleRequest({
      context,
      limit: effectiveLimit,
      ttl,
      throttler,
      blockDuration,
      getTracker,
      generateKey,
    });
  }
}
