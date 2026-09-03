import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CertificateSigningService,
  CertificateData,
  SignedCertificate,
} from './certificate-signing.service';

@Injectable()
export class CertificatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly signingService: CertificateSigningService,
  ) {}

  async findByNumber(certificateNumber: string) {
    const cert = await this.prisma.certificate.findUnique({
      where: { certificateNumber },
      include: {
        user: {
          select: { name: true, email: true },
        },
        course: {
          select: { title: true, teacher: { select: { name: true } } },
        },
      },
    });

    if (!cert) {
      throw new NotFoundException('Certificate not found or invalid.');
    }

    return cert;
  }

  async verifyCertificate(
    certificateNumber: string,
  ): Promise<{ valid: boolean; data?: SignedCertificate; error?: string }> {
    const cert = await this.findByNumber(certificateNumber);

    // Reconstruct certificate data for verification
    const certData: CertificateData = {
      certificateNumber: cert.certificateNumber,
      userId: cert.userId,
      courseId: cert.courseId,
      userName: cert.user?.name || '',
      courseTitle: cert.course?.title || '',
      issuedAt: cert.issuedAt,
      instructorName: cert.course?.teacher?.name ?? undefined,
    };

    const verification = this.signingService.verifyCertificate({
      data: certData,
      signature: cert.signature || '',
      publicKey: cert.publicKey || this.signingService.getPublicKey(),
      algorithm: 'RSA-SHA256',
    });

    if (verification.valid) {
      // Construct full SignedCertificate from stored data
      const signedCert: SignedCertificate = {
        data: certData,
        signature: cert.signature || '',
        publicKey: cert.publicKey || this.signingService.getPublicKey(),
        algorithm: cert.algorithm || 'RSA-SHA256',
      };
      return { valid: true, data: signedCert, error: undefined };
    }

    return {
      valid: false,
      error: verification.error || 'Invalid certificate signature',
    };
  }

  async findByUserId(userId: string) {
    return this.prisma.certificate.findMany({
      where: { userId },
      include: {
        course: {
          select: { title: true, teacher: { select: { name: true } } },
        },
      },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async issueSignedCertificate(
    userId: string,
    courseId: string,
    userName: string,
    courseTitle: string,
    instructorName?: string,
  ): Promise<string> {
    const certificateNumber = this.signingService.generateCertificateNumber(
      courseId,
      userId,
    );

    const certData: CertificateData = {
      certificateNumber,
      userId,
      courseId,
      userName,
      courseTitle,
      issuedAt: new Date(),
      instructorName,
    };

    const signed = this.signingService.signCertificate(certData);

    await this.prisma.certificate.create({
      data: {
        userId,
        courseId,
        certificateNumber,
        certificateUrl: `${process.env.BACKEND_URL || 'http://localhost:3000'}/certificates/${certificateNumber}.pdf`,
        signature: signed.signature,
        publicKey: signed.publicKey,
        algorithm: signed.algorithm,
      },
    });

    return certificateNumber;
  }

  getPublicKey(): string {
    return this.signingService.getPublicKey();
  }

  async issueCertificate(userId: string, courseId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { title: true, teacher: { select: { name: true } } },
    });

    if (!user || !course) {
      throw new NotFoundException('User or course not found');
    }

    return this.issueSignedCertificate(
      userId,
      courseId,
      user.name ?? '',
      course.title,
      course.teacher?.name ?? undefined,
    );
  }
}
