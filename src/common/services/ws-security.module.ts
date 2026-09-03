import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '../../redis/redis.module';
import { WsSecurityService } from './ws-security.service';

@Global()
@Module({
  imports: [ConfigModule, RedisModule.forRoot()],
  providers: [WsSecurityService],
  exports: [WsSecurityService],
})
export class WsSecurityModule {}
