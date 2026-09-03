import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StructuredLoggerService } from '../logger/structured-logger.service';

export enum AuditAction {
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  USER_LOGIN_FAILED = 'USER_LOGIN_FAILED',
  USER_REGISTERED = 'USER_REGISTERED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED = 'PASSWORD_RESET_COMPLETED',
  EMAIL_VERIFIED = 'EMAIL_VERIFIED',
  EMAIL_VERIFICATION_REQUESTED = 'EMAIL_VERIFICATION_REQUESTED',
  MFA_ENABLED = 'MFA_ENABLED',
  MFA_DISABLED = 'MFA_DISABLED',
  USER_PROFILE_UPDATED = 'USER_PROFILE_UPDATED',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  USER_DEACTIVATED = 'USER_DEACTIVATED',
  USER_ACTIVATED = 'USER_ACTIVATED',
  USER_DELETED = 'USER_DELETED',
  COURSE_CREATED = 'COURSE_CREATED',
  COURSE_UPDATED = 'COURSE_UPDATED',
  COURSE_DELETED = 'COURSE_DELETED',
  COURSE_PUBLISHED = 'COURSE_PUBLISHED',
  COURSE_UNPUBLISHED = 'COURSE_UNPUBLISHED',
  ENROLLMENT_CREATED = 'ENROLLMENT_CREATED',
  ENROLLMENT_COMPLETED = 'ENROLLMENT_COMPLETED',
  ENROLLMENT_CANCELLED = 'ENROLLMENT_CANCELLED',
  PAYMENT_CREATED = 'PAYMENT_CREATED',
  PAYMENT_APPROVED = 'PAYMENT_APPROVED',
  PAYMENT_REJECTED = 'PAYMENT_REJECTED',
  PAYMENT_REFUNDED = 'PAYMENT_REFUNDED',
  CERTIFICATE_ISSUED = 'CERTIFICATE_ISSUED',
  CERTIFICATE_VERIFIED = 'CERTIFICATE_VERIFIED',
  ASSIGNMENT_SUBMITTED = 'ASSIGNMENT_SUBMITTED',
  ASSIGNMENT_GRADED = 'ASSIGNMENT_GRADED',
  QUIZ_SUBMITTED = 'QUIZ_SUBMITTED',
  QUIZ_PASSED = 'QUIZ_PASSED',
  QUIZ_FAILED = 'QUIZ_FAILED',
  LESSON_COMPLETED = 'LESSON_COMPLETED',
  ADMIN_SETTINGS_CHANGED = 'ADMIN_SETTINGS_CHANGED',
  API_KEY_CREATED = 'API_KEY_CREATED',
  API_KEY_REVOKED = 'API_KEY_REVOKED',
  FILE_UPLOADED = 'FILE_UPLOADED',
  FILE_DELETED = 'FILE_DELETED',
  PERMISSION_GRANTED = 'PERMISSION_GRANTED',
  PERMISSION_REVOKED = 'PERMISSION_REVOKED',
  PRIVILEGE_ESCALATION_ATTEMPT = 'PRIVILEGE_ESCALATION_ATTEMPT',
  UNAUTHORIZED_ACCESS_ATTEMPT = 'UNAUTHORIZED_ACCESS_ATTEMPT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
}

export interface AuditLogEntry {
  action: AuditAction;
  userId?: string;
  actorId?: string;
  actorRole?: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  success: boolean;
  errorMessage?: string;
}

@Injectable()
export class AuditLogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: StructuredLoggerService,
  ) {
    this.logger.setContext('AuditLogService');
  }

  async log(entry: AuditLogEntry): Promise<void> {
    const logEntry = {
      ...entry,
      timestamp: new Date(),
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
    };

    try {
      await this.prisma.auditLog.create({
        data: logEntry as any,
      });
    } catch (error) {
      this.logger.error(
        `Failed to persist audit log: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }

    const logLevel = entry.success ? 'log' : 'warn';
    this.logger.logWithRequestId(
      logLevel as any,
      `AUDIT: ${entry.action}`,
      entry.metadata?.requestId as string || 'unknown',
      {
        action: entry.action,
        userId: entry.userId,
        actorId: entry.actorId,
        actorRole: entry.actorRole,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        ipAddress: entry.ipAddress,
        success: entry.success,
        errorMessage: entry.errorMessage,
        metadata: entry.metadata,
      },
    );
  }

  async logSecurityEvent(
    action: AuditAction,
    details: {
      userId?: string;
      actorId?: string;
      actorRole?: string;
      resourceType?: string;
      resourceId?: string;
      ipAddress?: string;
      userAgent?: string;
      metadata?: Record<string, unknown>;
      errorMessage?: string;
    },
  ): Promise<void> {
    await this.log({
      action,
      ...details,
      success: false,
    });
  }

  async logAuthEvent(
    action: AuditAction,
    userId: string,
    success: boolean,
    details: {
      ipAddress?: string;
      userAgent?: string;
      metadata?: Record<string, unknown>;
      errorMessage?: string;
    } = {},
  ): Promise<void> {
    await this.log({
      action,
      userId,
      success,
      ...details,
    });
  }

  async logPrivilegeEscalation(
    actorId: string,
    actorRole: string,
    attemptedAction: string,
    resourceType: string,
    resourceId: string,
    ipAddress?: string,
  ): Promise<void> {
    await this.logSecurityEvent(AuditAction.PRIVILEGE_ESCALATION_ATTEMPT, {
      actorId,
      actorRole,
      resourceType,
      resourceId,
      ipAddress,
      metadata: { attemptedAction },
      errorMessage: `User ${actorId} (${actorRole}) attempted ${attemptedAction} on ${resourceType}:${resourceId}`,
    });
  }

  async logUnauthorizedAccess(
    userId: string,
    resourceType: string,
    resourceId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logSecurityEvent(AuditAction.UNAUTHORIZED_ACCESS_ATTEMPT, {
      userId,
      resourceType,
      resourceId,
      ipAddress,
      userAgent,
      errorMessage: `Unauthorized access attempt to ${resourceType}:${resourceId}`,
    });
  }

  async logRateLimitExceeded(
    ipAddress: string,
    userId: string | undefined,
    endpoint: string,
    limit: number,
  ): Promise<void> {
    await this.logSecurityEvent(AuditAction.RATE_LIMIT_EXCEEDED, {
      userId,
      ipAddress,
      metadata: { endpoint, limit },
      errorMessage: `Rate limit exceeded for ${endpoint} (limit: ${limit})`,
    });
  }

  async getAuditLogs(
    filters: {
      userId?: string;
      action?: AuditAction;
      startDate?: Date;
      endDate?: Date;
      success?: boolean;
      page?: number;
      limit?: number;
    },
  ): Promise<{ data: any[]; total: number }> {
    const where: any = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = filters.action;
    if (filters.success !== undefined) where.success = filters.success;
    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = filters.startDate;
      if (filters.endDate) where.timestamp.lte = filters.endDate;
    }

    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 50, 100);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total };
  }
}