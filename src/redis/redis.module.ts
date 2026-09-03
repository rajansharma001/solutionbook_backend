import { Module, Global, DynamicModule } from '@nestjs/common';
import { RedisService } from './redis.service';

@Global()
@Module({})
export class RedisModule {
  static forRoot(): DynamicModule {
    return {
      module: RedisModule,
      providers: [RedisService],
      exports: [RedisService],
    };
  }
}