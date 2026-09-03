import { Module } from '@nestjs/common';
import { CertificatesService } from './certificates.service';
import { CertificatesController } from './certificates.controller';
import { CertificateSigningService } from './certificate-signing.service';

import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [CertificatesService, CertificateSigningService],
  controllers: [CertificatesController],
  exports: [CertificatesService, CertificateSigningService],
})
export class CertificatesModule {}
