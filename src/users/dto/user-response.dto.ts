import { Exclude, Expose, Type } from 'class-transformer';
import { UserRole } from '../../common/enums';

@Exclude()
export class StudentProfileResponse {
  @Expose()
  id: string;

  @Expose()
  headline?: string;

  @Expose()
  bio?: string;

  @Expose()
  portfolioUrl?: string;

  @Expose()
  githubUrl?: string;

  @Expose()
  linkedInUrl?: string;

  @Expose()
  resumeUrl?: string;

  @Expose()
  preferences?: string;
}

@Exclude()
export class InstructorProfileResponse {
  @Expose()
  id: string;

  @Expose()
  headline?: string;

  @Expose()
  bio?: string;

  @Expose()
  expertise?: string;

  @Expose()
  yearsOfExperience?: number;

  @Expose()
  websiteUrl?: string;

  @Expose()
  youtubeUrl?: string;

  @Expose()
  twitterUrl?: string;

  @Expose()
  linkedInUrl?: string;

  @Expose()
  githubUrl?: string;

  @Expose()
  coverImage?: string;

  @Expose()
  totalStudents?: number;

  @Expose()
  totalCourses?: number;

  @Expose()
  totalEarnings?: number;

  @Expose()
  averageRating?: number;
}

@Exclude()
export class UserResponseDto {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  role: UserRole | string;

  @Expose()
  name?: string;

  @Expose()
  profileImage?: string;

  @Expose()
  isEmailVerified: boolean;

  @Expose()
  isActive: boolean;

  @Expose()
  @Type(() => StudentProfileResponse)
  studentProfile?: StudentProfileResponse;

  @Expose()
  @Type(() => InstructorProfileResponse)
  instructorProfile?: InstructorProfileResponse;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Exclude()
  passwordHash: string;

  @Exclude()
  verificationToken?: string;

  @Exclude()
  verificationTokenExpires?: Date;

  @Exclude()
  resetPasswordToken?: string;

  @Exclude()
  resetPasswordExpires?: Date;

  @Exclude()
  failedLoginAttempts: number;

  @Exclude()
  lockedUntil?: Date;
}
