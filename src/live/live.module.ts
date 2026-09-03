import { Module } from '@nestjs/common';
import { LiveController } from './live.controller';
import { YoutubeCallbackController } from './callback.controller';
import { LiveService } from './live.service';
import { YoutubeService } from './youtube.service';
import { LiveGateway } from './live.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { WsSecurityModule } from '../common/services/ws-security.module';

@Module({
  imports: [PrismaModule, ConfigModule, WsSecurityModule],
  controllers: [LiveController, YoutubeCallbackController],
  providers: [LiveService, YoutubeService, LiveGateway],
  exports: [LiveService],
})
export class LiveModule {}
