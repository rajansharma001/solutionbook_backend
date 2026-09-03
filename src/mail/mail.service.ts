import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    const host = process.env.SMTP_HOST || 'smtp.ethereal.email';
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      });
      this.logger.log(`SMTP transporter initialized using configured credentials (${host}:${port})`);
    } else {
      this.logger.warn('SMTP_USER or SMTP_PASS not defined. Mail service running in mock/ethereal fallback mode.');
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: 'placeholder@ethereal.email',
          pass: 'placeholder',
        }
      });
      
      // Async generation in background
      nodemailer.createTestAccount().then((testAccount) => {
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        this.logger.log(`Ethereal fallback SMTP credentials dynamically generated. Testing User: ${testAccount.user}`);
      }).catch((err) => {
        this.logger.error('Failed to generate Ethereal test account fallback.', err);
      });
    }
  }

  async sendVerificationEmail(email: string, token: string, otp?: string) {
    const url = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/verify-email?token=${token}`;

    const mailOptions = {
      from: '"SikshyaHub" <noreply@sikshyahub.local>',
      to: email,
      subject: 'Verify your email address - SikshyaHub',
      html: `
        <h3>Welcome to SikshyaHub!</h3>
        <p>Please click the link below to verify your email address:</p>
        <a href="${url}">${url}</a>
        ${otp ? `<p>Alternatively, you can enter this OTP code: <strong>${otp}</strong></p>` : ''}
        <p>If you did not request this, please ignore this email.</p>
      `,
    };

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const info: any = await this.transporter.sendMail(mailOptions);
      
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      const messageId = info.messageId;

      this.logger.log(`Verification email sent to ${email}. Message ID: ${messageId}`);

      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        this.logger.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}`, error);
    }
  }

  async sendResetPasswordEmail(email: string, token: string) {
    const url = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/reset-password?token=${token}`;

    const mailOptions = {
      from: '"SikshyaHub" <noreply@sikshyahub.local>',
      to: email,
      subject: 'Reset your password - SikshyaHub',
      html: `
        <h3>SikshyaHub Password Reset Request</h3>
        <p>We received a request to reset your account password. Please click the link below to verify your identity and enter a new password:</p>
        <a href="${url}">${url}</a>
        <p>This verification link is valid for 1 hour. If you did not request a password reset, please ignore this email.</p>
      `,
    };

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const info: any = await this.transporter.sendMail(mailOptions);
      const messageId = info.messageId;

      this.logger.log(`Password reset email sent to ${email}. Message ID: ${messageId}`);

      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        this.logger.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}`, error);
    }
  }
}
