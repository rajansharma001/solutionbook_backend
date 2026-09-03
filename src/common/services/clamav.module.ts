import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClamavService } from './clamav.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [ClamavService],
  exports: [ClamavService],
})
export class ClamavModule {}
