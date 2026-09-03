import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { JwtService } from '@nestjs/jwt';
import { AdminService } from '../admin/admin.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly adminService: AdminService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 12);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const settings = await this.adminService.getSettings();
    const requireVerify = settings.requireEmailVerification ?? true;

    const user = await this.usersService.createUser({
      email: registerDto.email,
      passwordHash,
      verificationToken: requireVerify ? verificationToken : null,
      isEmailVerified: !requireVerify,
      profileData: JSON.stringify({ name: registerDto.name }),
    });

    if (requireVerify) {
      await this.mailService.sendVerificationEmail(user.email, verificationToken);
    }

    return {
      message: requireVerify
        ? 'Registration successful. Please check your email to verify your account.'
        : 'Registration successful. Welcome to SikshyaHub!',
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const settings = await this.adminService.getSettings();
    const requireVerify = settings.requireEmailVerification ?? true;

    if (requireVerify && !user.isEmailVerified) {
      throw new UnauthorizedException(
        'Please verify your email address before logging in',
      );
    }

    const payload = { sub: user.id, email: user.email, role: user.role };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profileData: user.profileData,
      },
    };
  }

  async verifyEmail(token: string) {
    const user = await this.usersService.findByVerificationToken(token);
    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.usersService.verifyEmail(user.email);

    return { message: 'Email verified successfully' };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('No account found with this email address.');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour validity

    await this.usersService.updateUser(user.id, {
      resetPasswordToken: resetToken,
      resetPasswordExpires: resetExpires,
    });

    await this.mailService.sendResetPasswordEmail(user.email, resetToken);

    return {
      message: 'A password reset link has been sent to your email address.',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.usersService.findByResetToken(token);
    if (!user) {
      throw new BadRequestException('Invalid or expired password reset token.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.usersService.updateUser(user.id, {
      passwordHash,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });

    return {
      message: 'Your password has been successfully reset.',
    };
  }
}
