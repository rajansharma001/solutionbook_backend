export interface RefreshTokenPayload {
  jti: string;
  userId: string;
  deviceFingerprint: string;
  createdAt: number;
  expiresAt: number;
  rotatedFrom?: string;
}

export interface RefreshTokenData extends RefreshTokenPayload {
  hash: string;
}

export const REFRESH_TOKEN_PREFIX = 'rt:';
export const REFRESH_TOKEN_BLACKLIST_PREFIX = 'blacklist:';

export function getRefreshTokenKey(userId: string, jti: string): string {
  return `${REFRESH_TOKEN_PREFIX}${userId}:${jti}`;
}

export function getBlacklistKey(jti: string): string {
  return `${REFRESH_TOKEN_BLACKLIST_PREFIX}${jti}`;
}

export function generateJti(): string {
  return crypto.randomUUID();
}

export function generateDeviceFingerprint(userAgent: string, ip: string, acceptLanguage?: string): string {
  const crypto = require('crypto');
  const data = `${userAgent}|${ip}|${acceptLanguage || ''}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
}

const crypto = require('crypto');