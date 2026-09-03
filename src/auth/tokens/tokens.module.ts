import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from '../../redis/redis.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { RefreshTokenService } from './refresh-token.service';
import { TokenBlacklistService } from './token-blacklist.service';
import { DeviceFingerprintGuard } from '../guards/device-fingerprint.guard';

@Module({
  imports: [
    RedisModule,
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_REFRESH_SECRET') || configService.get<string>('JWT_SECRET');
        if (!secret || secret.length < 32) {
          throw new Error('JWT_REFRESH_SECRET or JWT_SECRET must be at least 32 characters');
        }
        return { secret };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [
    RefreshTokenService,
    TokenBlacklistService,
    DeviceFingerprintGuard,
  ],
  exports: [
    RefreshTokenService,
    TokenBlacklistService,
    DeviceFingerprintGuard,
  ],
})
export class TokensModule {}