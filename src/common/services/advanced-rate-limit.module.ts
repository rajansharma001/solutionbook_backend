import { Module, Global } from '@nestjs/common';
import { RedisModule } from '../../redis/redis.module';
import { AdvancedRateLimitService } from './advanced-rate-limit.service';
import { CaptchaService } from './captcha.service';

@Global()
@Module({
  imports: [RedisModule.forRoot()],
  providers: [AdvancedRateLimitService, CaptchaService],
  exports: [AdvancedRateLimitService, CaptchaService],
})
export class AdvancedRateLimitModule {}
