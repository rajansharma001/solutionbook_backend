export enum CourseStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  PRIVATE = 'PRIVATE',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED',
}

export enum CourseLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
}

export enum CourseLanguage {
  ENGLISH = 'English',
  NEPALI = 'Nepali',
  HINDI = 'Hindi',
}

export enum LessonType {
  VIDEO = 'VIDEO',
  ARTICLE = 'ARTICLE',
  QUIZ = 'QUIZ',
  LIVE = 'LIVE',
  ASSIGNMENT = 'ASSIGNMENT',
}

export enum VideoProvider {
  YOUTUBE = 'youtube',
  VIMEO = 'vimeo',
  UPLOAD = 'upload',
}

export enum QuizQuestionType {
  MCQ = 'MCQ',
  TRUE_FALSE = 'TRUE_FALSE',
  TEXT = 'TEXT',
}

export enum AssignmentSubmissionType {
  FILE = 'FILE',
  LINK = 'LINK',
  TEXT = 'TEXT',
}

export enum AssignmentStatus {
  SUBMITTED = 'SUBMITTED',
  GRADED = 'GRADED',
  RESUBMISSION_REQUIRED = 'RESUBMISSION_REQUIRED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum EnrollmentPaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
}

export enum StudyMaterialCategory {
  NOTE = 'NOTE',
  QUESTION_PAPER = 'QUESTION_PAPER',
  SYLLABUS = 'SYLLABUS',
  SOLUTION = 'SOLUTION',
}

export enum StudyMaterialStatus {
  PENDING = 'PENDING',
  PUBLISHED = 'PUBLISHED',
  REJECTED = 'REJECTED',
}

export enum UserRole {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  ADMIN = 'ADMIN',
}

export enum LiveClassStatus {
  SCHEDULED = 'SCHEDULED',
  LIVE = 'LIVE',
  COMPLETED = 'COMPLETED',
  ENDED = 'ENDED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentType {
  COURSE = 'COURSE',
  RESOURCE = 'RESOURCE',
}

export enum PaymentMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',
  QR_CODE = 'QR_CODE',
  ADMIN_ENROLLMENT = 'ADMIN_ENROLLMENT',
}

export enum OTPPurpose {
  LOGIN = 'LOGIN',
  VERIFY_EMAIL = 'VERIFY_EMAIL',
  RESET_PASSWORD = 'RESET_PASSWORD',
}