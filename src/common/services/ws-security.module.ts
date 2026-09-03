import { Module, Global } from '@nestjs/common';
import { WsSecurityService } from './ws-security.service';

@Global()
@Module({
  providers: [WsSecurityService],
  exports: [WsSecurityService],
})
export class WsSecurityModule {}
