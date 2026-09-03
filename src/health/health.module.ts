import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [TerminusModule, PrismaModule, RedisModule.forRoot()],
  controllers: [HealthController],
  exports: [],
})
export class HealthModule {}