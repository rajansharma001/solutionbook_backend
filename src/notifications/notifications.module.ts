import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WsSecurityModule } from '../common/services/ws-security.module';

import { NotificationsGateway } from './notifications.gateway';

@Module({
  imports: [PrismaModule, WsSecurityModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}
