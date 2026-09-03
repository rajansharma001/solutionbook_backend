import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface CertificateData {
  certificateNumber: string;
  userId: string;
  courseId: string;
  userName: string;
  courseTitle: string;
  issuedAt: Date;
  instructorName?: string;
}

export interface SignedCertificate {
  data: CertificateData;
  signature: string;
  publicKey: string;
  algorithm: string;
}

@Injectable()
export class CertificateSigningService {
  private readonly logger = new Logger(CertificateSigningService.name);
  private readonly keyPair: { publicKey: string; privateKey: string };

  constructor(private readonly config: ConfigService) {
    // Generate or load RSA key pair for certificate signing
    const storedPrivateKey = this.config.get<string>('CERTIFICATE_PRIVATE_KEY');
    const storedPublicKey = this.config.get<string>('CERTIFICATE_PUBLIC_KEY');

    if (storedPrivateKey && storedPublicKey) {
      this.keyPair = {
        privateKey: storedPrivateKey,
        publicKey: storedPublicKey,
      };
    } else {
      this.keyPair = this.generateKeyPair();
      this.logger.warn(
        'Generated new certificate signing keys. Store CERTIFICATE_PRIVATE_KEY and CERTIFICATE_PUBLIC_KEY in .env for persistence.',
      );
    }
  }

  private generateKeyPair(): { publicKey: string; privateKey: string } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    return { publicKey, privateKey };
  }

  signCertificate(data: CertificateData): SignedCertificate {
    const payload = JSON.stringify(data, Object.keys(data).sort());
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(payload);
    sign.end();

    const signature = sign.sign(this.keyPair.privateKey, 'base64');

    return {
      data,
      signature,
      publicKey: this.keyPair.publicKey,
      algorithm: 'RSA-SHA256',
    };
  }

  verifyCertificate(signedCert: SignedCertificate): {
    valid: boolean;
    data?: CertificateData;
    error?: string;
  } {
    try {
      const payload = JSON.stringify(
        signedCert.data,
        Object.keys(signedCert.data).sort(),
      );
      const verify = crypto.createVerify('RSA-SHA256');
      verify.update(payload);
      verify.end();

      const isValid = verify.verify(
        signedCert.publicKey,
        signedCert.signature,
        'base64',
      );

      if (!isValid) {
        return { valid: false, error: 'Invalid signature' };
      }

      return { valid: true, data: signedCert.data };
    } catch (error) {
      return {
        valid: false,
        error: `Verification failed: ${(error as Error).message}`,
      };
    }
  }

  signAndStoreCertificate(data: CertificateData): string {
    const signed = this.signCertificate(data);

    // In production, you might store this in a separate certificates collection
    // For now, we'll return the certificate number which can be used to verify
    this.logger.log(`Certificate signed: ${data.certificateNumber}`);
    return data.certificateNumber;
  }

  getPublicKey(): string {
    return this.keyPair.publicKey;
  }

  // Generate a cryptographically secure certificate number
  generateCertificateNumber(courseId: string, userId: string): string {
    const timestamp = Date.now().toString(36);
    const randomPart = crypto.randomBytes(8).toString('hex');
    const coursePart = courseId.slice(0, 4).toUpperCase();
    const userPart = userId.slice(0, 4).toUpperCase();
    return `CERT-${coursePart}-${userPart}-${timestamp}-${randomPart}`;
  }
}
