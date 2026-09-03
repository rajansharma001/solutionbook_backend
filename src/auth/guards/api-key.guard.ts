import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeyService } from '../api-keys/api-key.service';
import { Reflector } from '@nestjs/core';

export const API_KEY_HEADER = 'x-api-key';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers[API_KEY_HEADER.toLowerCase()];

    if (!apiKey) {
      throw new UnauthorizedException('Missing API key. Provide it via X-API-Key header.');
    }

    const requiredScopes = this.reflector.get<string[]>('apiKeyScopes', context.getHandler());
    const result = await this.apiKeyService.validateApiKey(apiKey);

    if (requiredScopes && requiredScopes.length > 0) {
      const hasAllScopes = requiredScopes.every((scope) => result.scopes.includes(scope));
      if (!hasAllScopes) {
        throw new UnauthorizedException('Insufficient API key scopes');
      }
    }

    request.apiKeyInfo = result;
    return true;
  }
}
