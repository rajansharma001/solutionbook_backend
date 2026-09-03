import { Controller, Get, Param, UseGuards, Request, Query } from '@nestjs/common';
import { CertificatesService } from './certificates.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Get('my-certificates')
  @UseGuards(JwtAuthGuard)
  getMyCertificates(@Request() req: { user: { sub: string } }) {
    return this.certificatesService.findByUserId(req.user.sub);
  }

  @Get(':certNumber')
  verifyCertificate(@Param('certNumber') certNumber: string) {
    return this.certificatesService.findByNumber(certNumber);
  }

  @Get(':certNumber/verify')
  async verifyCertificateSignature(@Param('certNumber') certNumber: string) {
    return this.certificatesService.verifyCertificate(certNumber);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async verifyOwnCertificate(
    @Request() req: { user: { sub: string } },
    @Query('courseId') courseId: string,
  ) {
    const cert = await this.certificatesService.findByUserId(req.user.sub);
    const userCert = cert.find((c: any) => c.courseId === courseId);
    if (!userCert) {
      return { valid: false, error: 'Certificate not found for this course' };
    }
    return this.certificatesService.verifyCertificate(userCert.certificateNumber);
  }

  @Get('public-key')
  getPublicKey() {
    return { publicKey: this.certificatesService.getPublicKey() };
  }
}
