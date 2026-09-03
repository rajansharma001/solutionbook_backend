import { Module, Global } from '@nestjs/common';
import { RedisModule } from '../../redis/redis.module';
import { ClamavModule } from './clamav.module';
import { UploadSecurityService } from './upload-security.service';

@Global()
@Module({
  imports: [RedisModule.forRoot(), ClamavModule],
  providers: [UploadSecurityService],
  exports: [UploadSecurityService],
})
export class UploadSecurityModule {}
