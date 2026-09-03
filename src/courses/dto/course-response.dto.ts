import { Exclude, Expose, Type } from 'class-transformer';
import { CourseLevel, CourseLanguage, CourseStatus, LessonType, VideoProvider } from '../../common/enums';

@Exclude()
export class ModuleResponseDto {
  @Expose() id: string;
  @Expose() title: string;
  @Expose() slug?: string;
  @Expose() description?: string;
  @Expose() thumbnail?: string;
  @Expose() order?: number;
  @Expose() isPreview?: boolean;
  @Expose() duration?: number;
  @Expose() unlockDays?: number;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
}

@Exclude()
export class LessonResponseDto {
  @Expose() id: string;
  @Expose() title: string;
  @Expose() slug?: string;
  @Expose() description?: string;
  @Expose() lessonType: LessonType | string;
  @Expose() videoUrl?: string;
  @Expose() videoProvider?: VideoProvider | string;
  @Expose() videoDuration?: number;
  @Expose() thumbnail?: string;
  @Expose() content?: string;
  @Expose() isFreePreview?: boolean;
  @Expose() isDownloadable?: boolean;
  @Expose() order?: number;
  @Expose() xpPoints?: number;
  @Expose() estimatedTime?: number;
  @Expose() isPublished?: boolean;
  @Expose() submissionType?: string;
  @Expose() maxMarks?: number;
  @Expose() deadline?: string;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
}

@Exclude()
export class QuizResponseDto {
  @Expose() id: string;
  @Expose() lessonId: string;
  @Expose() timeLimit?: number;
  @Expose() passingScore?: number;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
}

@Exclude()
export class AssignmentResponseDto {
  @Expose() id: string;
  @Expose() lessonId: string;
  @Expose() description?: string;
  @Expose() submissionType: string;
  @Expose() maxMarks: number;
  @Expose() deadline?: string;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
}

@Exclude()
export class CourseResponseDto {
  @Expose() id: string;
  @Expose() title: string;
  @Expose() slug: string;
  @Expose() subtitle?: string;
  @Expose() description: string;
  @Expose() shortDescription?: string;
  @Expose() thumbnail?: string;
  @Expose() bannerImage?: string;
  @Expose() promoVideoUrl?: string;
  @Expose() category: string;
  @Expose() subCategory?: string;
  @Expose() tags: string;
  @Expose() classLevel?: string;
  @Expose() subject?: string;
  @Expose() program?: string;
  @Expose() level: CourseLevel | string;
  @Expose() language: CourseLanguage | string;
  @Expose() price: number;
  @Expose() discountPrice?: number;
  @Expose() currency: string;
  @Expose() isFree: boolean;
  @Expose() prerequisites: string;
  @Expose() teacherId: string;
  @Expose() coInstructorIds: string;
  @Expose() duration: number;
  @Expose() totalLessons: number;
  @Expose() totalTopics: number;
  @Expose() requirements: string;
  @Expose() learningOutcomes: string;
  @Expose() targetAudience: string;
  @Expose() prerequisiteCourseIds: string;
  @Expose() certificateEnabled: boolean;
  @Expose() hasLifetimeAccess: boolean;
  @Expose() status: CourseStatus | string;
  @Expose() isPublished: boolean;
  @Expose() isFeatured: boolean;
  @Expose() adminVerified: boolean;
  @Expose() seoTitle?: string;
  @Expose() seoDescription?: string;
  @Expose() seoKeywords?: string;
  @Expose() enrollmentCount: number;
  @Expose() rating: number;
  @Expose() reviewCount: number;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
  @Expose() publishedAt?: Date;

  @Expose()
  @Type(() => ModuleResponseDto)
  modules?: ModuleResponseDto[];

  @Expose()
  teacher?: {
    id: string;
    name?: string;
    profileImage?: string;
  };
}

@Exclude()
export class CourseListResponseDto {
  @Expose() id: string;
  @Expose() title: string;
  @Expose() slug: string;
  @Expose() subtitle?: string;
  @Expose() shortDescription?: string;
  @Expose() thumbnail?: string;
  @Expose() category: string;
  @Expose() level: CourseLevel | string;
  @Expose() language: CourseLanguage | string;
  @Expose() price: number;
  @Expose() discountPrice?: number;
  @Expose() isFree: boolean;
  @Expose() duration: number;
  @Expose() totalLessons: number;
  @Expose() status: CourseStatus | string;
  @Expose() isPublished: boolean;
  @Expose() isFeatured: boolean;
  @Expose() enrollmentCount: number;
  @Expose() rating: number;
  @Expose() reviewCount: number;
  @Expose() createdAt: Date;
  @Expose() teacherId: string;
}

@Exclude()
export class EnrollmentResponseDto {
  @Expose() id: string;
  @Expose() studentId: string;
  @Expose() courseId: string;
  @Expose() progress: number;
  @Expose() completed: boolean;
  @Expose() paymentStatus: string;
  @Expose() amount: number;
  @Expose() enrolledAt: Date;
  @Expose() expiresAt?: Date;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;

  @Expose()
  @Type(() => CourseListResponseDto)
  course?: CourseListResponseDto;
}
