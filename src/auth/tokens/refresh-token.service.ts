import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { TokenBlacklistService } from './token-blacklist.service';
import {
  RefreshTokenData,
  RefreshTokenPayload,
  generateJti,
  getRefreshTokenKey,
  generateDeviceFingerprint,
} from './refresh-token.entity';
import * as crypto from 'crypto';

@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly tokenBlacklist: TokenBlacklistService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private get refreshTtlDays(): number {
    return parseInt(this.config.get('REFRESH_TOKEN_TTL_DAYS') || '7', 10);
  }

  private get refreshTtlSeconds(): number {
    return this.refreshTtlDays * 24 * 60 * 60;
  }

  private get accessTtlMinutes(): number {
    return parseInt(this.config.get('ACCESS_TOKEN_TTL_MINUTES') || '15', 10);
  }

  async createRefreshToken(
    userId: string,
    deviceFingerprint: string,
    rotatedFromJti?: string,
  ): Promise<{ token: string; payload: RefreshTokenPayload }> {
    const jti = generateJti();
    const now = Date.now();
    const expiresAt = now + this.refreshTtlSeconds * 1000;

    const payload: RefreshTokenPayload = {
      jti,
      userId,
      deviceFingerprint,
      createdAt: now,
      expiresAt,
      rotatedFrom: rotatedFromJti,
    };

    const token = await this.jwtService.signAsync(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET') || this.config.get('JWT_SECRET'),
      expiresIn: `${this.refreshTtlDays}d`,
    });

    const hash = this.hashToken(token);

    const redisKey = getRefreshTokenKey(userId, jti);
    const redisData: RefreshTokenData = { ...payload, hash };

    await this.redis.getClient().set(redisKey, JSON.stringify(redisData), 'EX', this.refreshTtlSeconds);

    this.logger.log(`Created refresh token for user ${userId} (jti: ${jti})`);

    return { token, payload };
  }

  async verifyRefreshToken(
    token: string,
    deviceFingerprint: string,
  ): Promise<{ payload: RefreshTokenPayload; isRotated: boolean }> {
    let payload: RefreshTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.config.get('JWT_REFRESH_SECRET') || this.config.get('JWT_SECRET'),
      });
    } catch (error) {
      this.logger.warn('Invalid refresh token signature');
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (await this.tokenBlacklist.isBlacklisted(payload.jti)) {
      this.logger.warn(`Blacklisted refresh token used: ${payload.jti}`);
      await this.revokeAllUserTokens(payload.userId);
      throw new UnauthorizedException('Token has been revoked');
    }

    const redisKey = getRefreshTokenKey(payload.userId, payload.jti);
    const storedData = await this.redis.getClient().get(redisKey);

    if (!storedData) {
      this.logger.warn(`Refresh token not found in store: ${payload.jti}`);
      throw new UnauthorizedException('Refresh token not found or expired');
    }

    const stored: RefreshTokenData = JSON.parse(storedData);

    if (stored.hash !== this.hashToken(token)) {
      this.logger.warn(`Token hash mismatch for jti: ${payload.jti}`);
      await this.tokenBlacklist.add(payload.jti, this.refreshTtlSeconds);
      throw new UnauthorizedException('Token integrity check failed');
    }

    if (stored.deviceFingerprint !== deviceFingerprint) {
      this.logger.warn(`Device fingerprint mismatch for user ${payload.userId}`);
      await this.tokenBlacklist.add(payload.jti, this.refreshTtlSeconds);
      throw new UnauthorizedException('Device fingerprint mismatch');
    }

    if (Date.now() > stored.expiresAt) {
      this.logger.warn(`Expired refresh token used: ${payload.jti}`);
      await this.redis.getClient().del(redisKey);
      throw new UnauthorizedException('Refresh token expired');
    }

    return { payload, isRotated: false };
  }

  async rotateRefreshToken(
    oldToken: string,
    deviceFingerprint: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { payload } = await this.verifyRefreshToken(oldToken, deviceFingerprint);

    await this.tokenBlacklist.add(payload.jti, this.refreshTtlSeconds);

    const redisKey = getRefreshTokenKey(payload.userId, payload.jti);
    await this.redis.getClient().del(redisKey);

    const { token: newRefreshToken } = await this.createRefreshToken(
      payload.userId,
      deviceFingerprint,
      payload.jti,
    );

    const accessToken = await this.generateAccessToken(payload.userId);

    this.logger.log(`Rotated refresh token for user ${payload.userId} (old: ${payload.jti})`);

    return { accessToken, refreshToken: newRefreshToken };
  }

  async revokeRefreshToken(token: string): Promise<void> {
    let payload: RefreshTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.config.get('JWT_REFRESH_SECRET') || this.config.get('JWT_SECRET'),
      });
    } catch {
      return;
    }

    await this.tokenBlacklist.add(payload.jti, this.refreshTtlSeconds);

    const redisKey = getRefreshTokenKey(payload.userId, payload.jti);
    await this.redis.getClient().del(redisKey);

    this.logger.log(`Revoked refresh token for user ${payload.userId} (jti: ${payload.jti})`);
  }

  async revokeAllUserTokens(userId: string): Promise<number> {
    const pattern = `rt:${userId}:*`;
    const keys = await this.redis.getClient().keys(pattern);

    if (keys.length > 0) {
      const jtis = keys.map((key) => key.split(':').pop()!);
      await this.tokenBlacklist.addMultiple(jtis, this.refreshTtlSeconds);
      await this.redis.getClient().del(...keys);
    }

    this.logger.log(`Revoked all ${keys.length} refresh tokens for user ${userId}`);
    return keys.length;
  }

  async revokeUserTokensExceptCurrent(userId: string, currentJti: string): Promise<number> {
    const pattern = `rt:${userId}:*`;
    const keys = await this.redis.getClient().keys(pattern);

    const otherKeys = keys.filter((key) => !key.endsWith(`:${currentJti}`));

    if (otherKeys.length > 0) {
      const jtis = otherKeys.map((key) => key.split(':').pop()!);
      await this.tokenBlacklist.addMultiple(jtis, this.refreshTtlSeconds);
      await this.redis.getClient().del(...otherKeys);
    }

    this.logger.log(`Revoked ${otherKeys.length} other refresh tokens for user ${userId}`);
    return otherKeys.length;
  }

  async generateAccessToken(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, name: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      {
        secret: this.config.get('JWT_SECRET'),
        expiresIn: `${this.accessTtlMinutes}m`,
      },
    );
  }

  async getUserActiveSessions(userId: string): Promise<RefreshTokenPayload[]> {
    const pattern = `rt:${userId}:*`;
    const keys = await this.redis.getClient().keys(pattern);

    const sessions: RefreshTokenPayload[] = [];

    for (const key of keys) {
      const data = await this.redis.getClient().get(key);
      if (data) {
        const stored: RefreshTokenData = JSON.parse(data);
        if (Date.now() < stored.expiresAt) {
          sessions.push({
            jti: stored.jti,
            userId: stored.userId,
            deviceFingerprint: stored.deviceFingerprint,
            createdAt: stored.createdAt,
            expiresAt: stored.expiresAt,
            rotatedFrom: stored.rotatedFrom,
          });
        }
      }
    }

    return sessions.sort((a, b) => b.createdAt - a.createdAt);
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  generateDeviceFingerprint(req: { headers: { 'user-agent'?: string; 'accept-language'?: string } }, ip: string): string {
    return generateDeviceFingerprint(
      req.headers['user-agent'] || '',
      ip,
      req.headers['accept-language'],
    );
  }
}