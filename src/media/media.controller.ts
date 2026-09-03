import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { diskStorage } from 'multer';
import { join, basename } from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request as ExpressRequest } from 'express';
import * as crypto from 'crypto';
import { UploadSecurityService } from '../common/services/upload-security.service';

// ─── Security constants ───────────────────────────────────────────────────────

/** Extensions that can execute code and must never be accepted. */
const BLOCKED_EXTENSIONS = new Set([
  'exe',
  'sh',
  'bat',
  'cmd',
  'com',
  'ps1',
  'psm1',
  'vbs',
  'vbe',
  'js',
  'jsx',
  'ts',
  'tsx',
  'php',
  'php3',
  'php4',
  'php5',
  'phtml',
  'py',
  'rb',
  'pl',
  'cgi',
  'asp',
  'aspx',
  'war',
  'jar',
  'class',
  'elf',
  'msi',
  'dmg',
  'deb',
  'rpm',
  'apk',
  'ipa',
]);

/** Allowed MIME types mapped to their canonical file extension. */
const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};

/**
 * Magic-byte signatures for server-side MIME verification.
 * Multer's `fileFilter` only checks the browser-reported MIME type which can be
 * spoofed.  We re-read the first bytes of the saved file to confirm its real type.
 */
const MAGIC_BYTES: Array<{
  mime: string;
  offset: number;
  bytes: Buffer;
}> = [
  { mime: 'image/jpeg', offset: 0, bytes: Buffer.from([0xff, 0xd8, 0xff]) },
  {
    mime: 'image/png',
    offset: 0,
    bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
  },
  {
    mime: 'image/gif',
    offset: 0,
    bytes: Buffer.from([0x47, 0x49, 0x46, 0x38]),
  },
  {
    mime: 'image/webp',
    offset: 8,
    bytes: Buffer.from([0x57, 0x45, 0x42, 0x50]),
  },
  {
    mime: 'application/pdf',
    offset: 0,
    bytes: Buffer.from([0x25, 0x50, 0x44, 0x46]),
  },
  {
    mime: 'video/mp4',
    offset: 4,
    bytes: Buffer.from([0x66, 0x74, 0x79, 0x70]),
  },
];

/** Max read size for magic-byte detection */
const MAGIC_READ_BYTES = 16;

interface RequestWithUser {
  user: { sub: string; role: string };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Sanitise a filename:
 *  - Remove path traversal sequences (../, /, \)
 *  - Strip shell metacharacters
 *  - Keep only safe characters
 */
function sanitizeFilename(name: string): string {
  // Take only the basename (strip any directory component)
  let safe = basename(name);
  // Remove null bytes and control characters (0x00-0x1F and 0x7F)
  // eslint-disable-next-line no-control-regex
  safe = safe.replace(/[\u0000-\u001F\u007F]/g, '');
  // Replace any whitespace with underscores
  safe = safe.replace(/\s+/g, '_');
  // Allow only alphanumeric, dash, underscore and dot
  safe = safe.replace(/[^a-zA-Z0-9._-]/g, '_');
  // Prevent hidden files
  if (safe.startsWith('.')) safe = '_' + safe;
  return safe || 'upload';
}

/**
 * Verify a file's actual MIME type by reading its magic bytes.
 * Returns true only for recognised, safe file types.
 */
function verifyMagicBytes(filePath: string, expectedMime: string): boolean {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(MAGIC_READ_BYTES);
    fs.readSync(fd, buf, 0, MAGIC_READ_BYTES, 0);
    fs.closeSync(fd);

    // SVG is text-based; check for <svg tag instead
    if (expectedMime === 'image/svg+xml') {
      const text = buf.toString('ascii').toLowerCase();
      return text.includes('<svg') || text.startsWith('<?xml');
    }

    // WebM magic bytes: 0x1A 0x45 0xDF 0xA3
    if (expectedMime === 'video/webm') {
      return (
        buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3
      );
    }

    const sig = MAGIC_BYTES.find((s) => s.mime === expectedMime);
    if (!sig) return false;

    const slice = buf.slice(sig.offset, sig.offset + sig.bytes.length);
    return slice.equals(sig.bytes);
  } catch {
    return false;
  }
}

/** Build shared Multer storage config (destination driven by userId). */
function buildStorage() {
  return diskStorage({
    destination: (
      req: ExpressRequest & { user?: { sub?: string } },
      _file,
      cb,
    ) => {
      const userId = req.user?.sub ?? 'unknown';
      const uploadPath = join(process.cwd(), 'uploads', 'users', userId);
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (_req, file, cb) => {
      const ext = ALLOWED_MIME_TYPES[file.mimetype] ?? 'bin';
      cb(null, `${uuidv4()}.${ext}`);
    },
  });
}

/** Multer fileFilter: validates MIME type and blocked extensions. */
const secureFileFilter = (
  _req: ExpressRequest,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) => {
  // 1. Check that the MIME type is on the allow-list
  if (!ALLOWED_MIME_TYPES[file.mimetype]) {
    return cb(
      new BadRequestException(
        `File type not allowed: ${file.mimetype}. Accepted types: ${Object.keys(ALLOWED_MIME_TYPES).join(', ')}`,
      ),
      false,
    );
  }

  // 2. Derive extension from the original filename and block dangerous ones
  const originalName = sanitizeFilename(file.originalname);
  const extMatch = originalName.match(/\.([^.]+)$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : '';
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return cb(
      new BadRequestException(`File extension '.${ext}' is not allowed.`),
      false,
    );
  }

  cb(null, true);
};

// ─── Controller ───────────────────────────────────────────────────────────────

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly uploadSecurity: UploadSecurityService,
  ) {}

  @Get()
  getUserMedia(@Request() req: RequestWithUser) {
    if (req.user.role === 'ADMIN') {
      return this.mediaService.getAllMedia();
    }
    return this.mediaService.getUserMedia(req.user.sub);
  }

  @Get(':id')
  async getMedia(@Param('id') id: string, @Request() req: RequestWithUser) {
    const media = await this.mediaService.getMediaById(id);
    if (!media) throw new BadRequestException('Media not found');

    // Only owner or admin can retrieve media metadata
    if (media.uploadedById !== req.user.sub && req.user.role !== 'ADMIN') {
      throw new ForbiddenException('You do not have access to this media');
    }
    return media;
  }

  // ── Standard upload (all authenticated users, 10 MB cap) ─────────────────────

  @Post('upload')
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      storage: buildStorage(),
      fileFilter: secureFileFilter,
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    }),
  )
  async uploadFile(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Request() req: RequestWithUser,
  ) {
    if (!files?.length) throw new BadRequestException('No files provided');

    // Check total quota for all files
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const quotaCheck = await this.uploadSecurity.checkQuota(
      req.user.sub,
      req.user.role,
      totalSize,
    );
    if (!quotaCheck.allowed) {
      throw new BadRequestException(quotaCheck.reason);
    }

    return this.processUploads(files, req.user.sub);
  }

  // ── Large upload (ADMIN / TEACHER only, 500 MB cap) ───────────────────────────

  @Post('upload-large')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'TEACHER')
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      storage: buildStorage(),
      fileFilter: secureFileFilter,
      limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
    }),
  )
  async uploadLargeFile(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Request() req: RequestWithUser,
  ) {
    if (!files?.length) throw new BadRequestException('No files provided');

    // Check total quota for all files
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const quotaCheck = await this.uploadSecurity.checkQuota(
      req.user.sub,
      req.user.role,
      totalSize,
    );
    if (!quotaCheck.allowed) {
      throw new BadRequestException(quotaCheck.reason);
    }

    return this.processUploads(files, req.user.sub);
  }

  // ── Shared upload processing ──────────────────────────────────────────────────

  private async processUploads(
    files: Array<Express.Multer.File>,
    userId: string,
  ) {
    const uploadedRecords = [];

    for (const file of files) {
      const filePath = file.path;

      // 1. Magic-byte verification — rejects files whose content doesn't match
      //    the claimed MIME type (e.g. a PHP file renamed to .jpg)
      const magicOk = verifyMagicBytes(filePath, file.mimetype);
      if (!magicOk) {
        // Delete the unsafe file immediately
        try {
          fs.unlinkSync(filePath);
        } catch {
          /* ignore */
        }
        throw new BadRequestException(
          `File content does not match the declared type (${file.mimetype}). Upload rejected.`,
        );
      }

      // 2. ClamAV virus scan
      await this.uploadSecurity.scanAndValidateFile(filePath, file.mimetype);

      // 3. Content-hash deduplication
      const fileBuffer = fs.readFileSync(filePath);
      const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      const existing = await this.mediaService.findMediaByHash(userId, hash);
      if (existing) {
        fs.unlinkSync(filePath);
        uploadedRecords.push(existing);
        continue;
      }

      const url = `/uploads/users/${userId}/${file.filename}`;
      const record = await this.mediaService.createMediaRecord(userId, {
        filename: file.filename,
        originalName: sanitizeFilename(file.originalname),
        url,
        mimeType: file.mimetype,
        size: file.size,
        hash,
      });

      // 4. Increment upload quota
      await this.uploadSecurity.incrementUsage(userId, file.size);

      uploadedRecords.push(record);
    }

    return uploadedRecords;
  }

  // ── Update media metadata ──────────────────────────────────────────────────────

  @Patch(':id')
  async updateMedia(
    @Param('id') id: string,
    @Body() body: { originalName: string },
    @Request() req: RequestWithUser,
  ) {
    const media = await this.mediaService.getMediaById(id);
    if (!media) throw new BadRequestException('Media not found');
    if (media.uploadedById !== req.user.sub && req.user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'You do not have permission to edit this file.',
      );
    }
    // Sanitize the new original name before persisting
    return this.mediaService.updateMedia(id, {
      originalName: sanitizeFilename(body.originalName ?? ''),
    });
  }

  // ── Delete media ──────────────────────────────────────────────────────────────

  @Delete(':id')
  async deleteMedia(@Param('id') id: string, @Request() req: RequestWithUser) {
    const media = await this.mediaService.getMediaById(id);
    if (!media) throw new BadRequestException('Media not found');
    if (media.uploadedById !== req.user.sub && req.user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'You do not have permission to delete this file.',
      );
    }
    return this.mediaService.deleteMedia(id);
  }
}
