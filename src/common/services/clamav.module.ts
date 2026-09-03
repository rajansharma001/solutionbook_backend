import { Module, Global } from '@nestjs/common';
import { ClamavService } from './clamav.service';

@Global()
@Module({
  providers: [ClamavService],
  exports: [ClamavService],
})
export class ClamavModule {}
