import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RefreshTokenService } from '../tokens/refresh-token.service';

export const DEVICE_FINGERPRINT_KEY = 'deviceFingerprint';
export const SkipDeviceFingerprint = () => Reflector.createDecorator<boolean>();

@Injectable()
export class DeviceFingerprintGuard implements CanActivate {
  private readonly logger = new Logger(DeviceFingerprintGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const skip = this.reflector.getAllAndOverride<boolean>(SkipDeviceFingerprint, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skip) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const ip = request.ip || request.socket.remoteAddress || 'unknown';

    const fingerprint = this.refreshTokenService.generateDeviceFingerprint(request, ip);

    (request as Request & { deviceFingerprint: string }).deviceFingerprint = fingerprint;

    return true;
  }
}