import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UploadSecurityService } from '../common/services/upload-security.service';

export interface AssignmentSubmissionValidationResult {
  valid: boolean;
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
  error?: string;
}

export interface AssignmentValidationConfig {
  maxFileSizeMB: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
}

@Injectable()
export class AssignmentValidationService {
  private readonly logger = new Logger(AssignmentValidationService.name);
  private readonly config: AssignmentValidationConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly uploadSecurity: UploadSecurityService,
  ) {
    this.config = {
      maxFileSizeMB:
        this.configService.get<number>('ASSIGNMENT_MAX_FILE_SIZE_MB') || 50,
      allowedMimeTypes: [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/webm',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'application/zip',
      ],
      allowedExtensions: [
        'pdf',
        'jpg',
        'jpeg',
        'png',
        'gif',
        'webp',
        'mp4',
        'webm',
        'doc',
        'docx',
        'xls',
        'xlsx',
        'txt',
        'zip',
      ],
    };
  }

  async validateSubmission(
    file: Express.Multer.File,
    userId: string,
    _lessonId: string,
  ): Promise<AssignmentSubmissionValidationResult> {
    // 1. Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > this.config.maxFileSizeMB) {
      return {
        valid: false,
        error: `File size (${fileSizeMB.toFixed(2)} MB) exceeds maximum allowed (${this.config.maxFileSizeMB} MB)`,
      };
    }

    // 2. Check MIME type
    if (!this.config.allowedMimeTypes.includes(file.mimetype)) {
      return {
        valid: false,
        error: `File type ${file.mimetype} not allowed. Allowed types: ${this.config.allowedMimeTypes.join(', ')}`,
      };
    }

    // 3. Check file extension
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (!ext || !this.config.allowedExtensions.includes(ext)) {
      return {
        valid: false,
        error: `File extension .${ext} not allowed. Allowed: ${this.config.allowedExtensions.join(', ')}`,
      };
    }

    // 4. Magic byte verification
    const magicOk = await this.uploadSecurity.validateMagicBytes(
      file.path,
      file.mimetype,
    );
    if (!magicOk) {
      return {
        valid: false,
        error: 'File content does not match declared type',
      };
    }

    // 5. ClamAV virus scan
    try {
      await this.uploadSecurity.scanAndValidateFile(file.path, file.mimetype);
    } catch (error) {
      return {
        valid: false,
        error: `File rejected: ${(error as Error).message}`,
      };
    }

    // 6. Upload quota check
    const quotaCheck = await this.uploadSecurity.checkQuota(
      userId,
      'STUDENT',
      file.size,
    );
    if (!quotaCheck.allowed) {
      return {
        valid: false,
        error: quotaCheck.reason || 'Upload quota exceeded',
      };
    }

    // 7. Verify lesson exists and user is enrolled
    // This would be done by the caller (controller/service) via guards

    return {
      valid: true,
      fileUrl: file.path,
      fileSize: file.size,
      mimeType: file.mimetype,
    };
  }

  async incrementQuotaUsage(userId: string, bytes: number): Promise<void> {
    await this.uploadSecurity.incrementUsage(userId, bytes);
  }

  getConfig(): AssignmentValidationConfig {
    return { ...this.config };
  }
}
