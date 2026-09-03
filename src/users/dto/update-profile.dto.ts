import { IsString, IsOptional, IsUrl, IsNumber, IsObject, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateStudentProfileDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  headline?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  bio?: string;

  @IsUrl({}, { message: 'portfolioUrl must be a valid URL' })
  @IsOptional()
  portfolioUrl?: string;

  @IsUrl({}, { message: 'githubUrl must be a valid URL' })
  @IsOptional()
  githubUrl?: string;

  @IsUrl({}, { message: 'linkedInUrl must be a valid URL' })
  @IsOptional()
  linkedInUrl?: string;

  @IsUrl({}, { message: 'resumeUrl must be a valid URL' })
  @IsOptional()
  resumeUrl?: string;

  @IsString()
  @IsOptional()
  preferences?: string;
}

export class UpdateInstructorProfileDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  headline?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  bio?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  expertise?: string;

  @IsNumber()
  @IsOptional()
  yearsOfExperience?: number;

  @IsUrl({}, { message: 'websiteUrl must be a valid URL' })
  @IsOptional()
  websiteUrl?: string;

  @IsUrl({}, { message: 'youtubeUrl must be a valid URL' })
  @IsOptional()
  youtubeUrl?: string;

  @IsUrl({}, { message: 'twitterUrl must be a valid URL' })
  @IsOptional()
  twitterUrl?: string;

  @IsUrl({}, { message: 'linkedInUrl must be a valid URL' })
  @IsOptional()
  linkedInUrl?: string;

  @IsUrl({}, { message: 'githubUrl must be a valid URL' })
  @IsOptional()
  githubUrl?: string;

  @IsUrl({}, { message: 'coverImage must be a valid URL' })
  @IsOptional()
  coverImage?: string;
}

export class InstructorUpdateDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  headline?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  bio?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  expertise?: string;

  @IsOptional()
  yearsOfExperience?: string | number;
}

export class StudentUpdateDto {
  @IsString()
  @IsOptional()
  preferences?: string;
}

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsUrl({}, { message: 'profileImage must be a valid URL' })
  @IsOptional()
  profileImage?: string;

  @IsString()
  @IsOptional()
  profileData?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => InstructorUpdateDto)
  instructor?: InstructorUpdateDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => StudentUpdateDto)
  student?: StudentUpdateDto;
}
