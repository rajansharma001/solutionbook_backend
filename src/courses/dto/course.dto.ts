import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
} from 'class-validator';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  subtitle?: string;

  @IsString()
  @IsOptional()
  shortDescription?: string;

  @IsString()
  @IsOptional()
  thumbnail?: string;

  @IsString()
  @IsOptional()
  bannerImage?: string;

  @IsString()
  @IsOptional()
  promoVideoUrl?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  subCategory?: string;

  @IsString()
  @IsOptional()
  tags?: string;

  @IsString()
  @IsOptional()
  level?: string;

  @IsString()
  @IsOptional()
  language?: string;

  @IsNumber()
  @IsOptional()
  discountPrice?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsOptional()
  isFree?: boolean;

  @IsString()
  @IsOptional()
  coInstructorIds?: string;

  @IsNumber()
  @IsOptional()
  duration?: number;

  @IsNumber()
  @IsOptional()
  totalLessons?: number;

  @IsNumber()
  @IsOptional()
  totalTopics?: number;

  @IsString()
  @IsOptional()
  requirements?: string;

  @IsString()
  @IsOptional()
  learningOutcomes?: string;

  @IsString()
  @IsOptional()
  targetAudience?: string;

  @IsOptional()
  certificateEnabled?: boolean;

  @IsOptional()
  hasLifetimeAccess?: boolean;

  @IsOptional()
  isPublished?: boolean;

  @IsOptional()
  isFeatured?: boolean;

  @IsString()
  @IsOptional()
  seoTitle?: string;

  @IsString()
  @IsOptional()
  seoDescription?: string;

  @IsString()
  @IsOptional()
  seoKeywords?: string;
}

export class UpdateCourseDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  subtitle?: string;

  @IsString()
  @IsOptional()
  shortDescription?: string;

  @IsString()
  @IsOptional()
  thumbnail?: string;

  @IsString()
  @IsOptional()
  bannerImage?: string;

  @IsString()
  @IsOptional()
  promoVideoUrl?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  subCategory?: string;

  @IsString()
  @IsOptional()
  tags?: string;

  @IsString()
  @IsOptional()
  level?: string;

  @IsString()
  @IsOptional()
  language?: string;

  @IsNumber()
  @IsOptional()
  discountPrice?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsOptional()
  isFree?: boolean;

  @IsString()
  @IsOptional()
  coInstructorIds?: string;

  @IsNumber()
  @IsOptional()
  duration?: number;

  @IsNumber()
  @IsOptional()
  totalLessons?: number;

  @IsNumber()
  @IsOptional()
  totalTopics?: number;

  @IsString()
  @IsOptional()
  requirements?: string;

  @IsString()
  @IsOptional()
  learningOutcomes?: string;

  @IsString()
  @IsOptional()
  targetAudience?: string;

  @IsOptional()
  certificateEnabled?: boolean;

  @IsOptional()
  hasLifetimeAccess?: boolean;

  @IsOptional()
  isPublished?: boolean;

  @IsOptional()
  isFeatured?: boolean;

  @IsString()
  @IsOptional()
  seoTitle?: string;

  @IsString()
  @IsOptional()
  seoDescription?: string;

  @IsString()
  @IsOptional()
  seoKeywords?: string;
}

export class CreateModuleDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  thumbnail?: string;

  @IsNumber()
  @IsOptional()
  order?: number;

  @IsOptional()
  isPreview?: boolean;

  @IsNumber()
  @IsOptional()
  duration?: number;
}

export class UpdateModuleDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  thumbnail?: string;

  @IsNumber()
  @IsOptional()
  order?: number;

  @IsOptional()
  isPreview?: boolean;

  @IsNumber()
  @IsOptional()
  duration?: number;
}

export class CreateLessonDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  lessonType?: string;

  @IsString()
  @IsOptional()
  videoUrl?: string;

  @IsString()
  @IsOptional()
  videoProvider?: string;

  @IsNumber()
  @IsOptional()
  videoDuration?: number;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  thumbnail?: string;

  @IsString()
  @IsOptional()
  attachments?: string;

  @IsString()
  @IsOptional()
  codeFiles?: string;

  @IsString()
  @IsOptional()
  externalLinks?: string;

  @IsOptional()
  isFreePreview?: boolean;

  @IsOptional()
  isDownloadable?: boolean;

  @IsNumber()
  @IsOptional()
  order?: number;

  @IsNumber()
  @IsOptional()
  xpPoints?: number;

  @IsNumber()
  @IsOptional()
  estimatedTime?: number;

  @IsOptional()
  isPublished?: boolean;
}

export class UpdateLessonDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  lessonType?: string;

  @IsString()
  @IsOptional()
  videoUrl?: string;

  @IsString()
  @IsOptional()
  videoProvider?: string;

  @IsNumber()
  @IsOptional()
  videoDuration?: number;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  thumbnail?: string;

  @IsString()
  @IsOptional()
  attachments?: string;

  @IsString()
  @IsOptional()
  codeFiles?: string;

  @IsString()
  @IsOptional()
  externalLinks?: string;

  @IsOptional()
  isFreePreview?: boolean;

  @IsOptional()
  isDownloadable?: boolean;

  @IsNumber()
  @IsOptional()
  order?: number;

  @IsNumber()
  @IsOptional()
  xpPoints?: number;

  @IsNumber()
  @IsOptional()
  estimatedTime?: number;

  @IsOptional()
  isPublished?: boolean;
}

export class CreateQuizDto {
  @IsNumber()
  @IsOptional()
  timeLimit?: number;

  @IsNumber()
  @IsOptional()
  passingScore?: number;
}

export class CreateQuizQuestionDto {
  @IsString()
  @IsNotEmpty()
  question!: string;

  @IsString()
  @IsOptional()
  questionType?: string;

  @IsString()
  @IsOptional()
  options?: string; // JSON array of options

  @IsString()
  @IsNotEmpty()
  correctAnswer!: string;

  @IsString()
  @IsOptional()
  explanation?: string;

  @IsNumber()
  @IsOptional()
  marks?: number;

  @IsNumber()
  @IsOptional()
  order?: number;
}

export class UpdateQuizQuestionDto {
  @IsString()
  @IsOptional()
  question?: string;

  @IsString()
  @IsOptional()
  questionType?: string;

  @IsString()
  @IsOptional()
  options?: string;

  @IsString()
  @IsOptional()
  correctAnswer?: string;

  @IsString()
  @IsOptional()
  explanation?: string;

  @IsNumber()
  @IsOptional()
  marks?: number;

  @IsNumber()
  @IsOptional()
  order?: number;
}

export class SubmitQuizDto {
  @IsString()
  @IsNotEmpty()
  answers!: string; // JSON string of { [questionId]: answer }
}

export class SubmitAssignmentDto {
  @IsString()
  @IsNotEmpty()
  submissionType!: string; // TEXT, LINK, FILE

  @IsString()
  @IsNotEmpty()
  content!: string; // Text answer, link url or uploaded file url
}

export class CreateReviewDto {
  @IsNumber()
  rating!: number;

  @IsString()
  @IsOptional()
  comment?: string;
}


