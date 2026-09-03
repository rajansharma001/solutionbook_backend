import { Injectable, Logger, LoggerService, LogLevel } from '@nestjs/common';
import * as crypto from 'crypto';

const PII_FIELDS = new Set([
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'verificationToken',
  'resetPasswordToken',
  'email',
  'phone',
  'phoneNumber',
  'ssn',
  'socialSecurityNumber',
  'creditCard',
  'creditCardNumber',
  'cvv',
  'apiKey',
  'secret',
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'idempotencyKey',
]);

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const LOG_LEVEL = (process.env.LOG_LEVEL || (IS_PRODUCTION ? 'warn' : 'debug')) as LogLevel;

const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  log: 2,
  debug: 3,
  verbose: 4,
  fatal: 0,
};

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] <= LOG_LEVELS[LOG_LEVEL];
}

function maskPII(obj: unknown, depth = 0): unknown {
  if (depth > 10) return obj;
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    if (obj.includes('@') && obj.includes('.') && obj.length < 256) {
      const [local, domain] = obj.split('@');
      if (local.length > 2) return `${local.substring(0, 2)}***@${domain}`;
    }
    if (/^[\d\s\-+()]{10,}$/.test(obj.replace(/\s/g, ''))) {
      return obj.replace(/\d(?=\d{4})/g, '*');
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => maskPII(item, depth + 1));
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      if (PII_FIELDS.has(lowerKey) || PII_FIELDS.has(key)) {
        if (typeof value === 'string' && value.length > 4) {
          result[key] = `${value.substring(0, 2)}***${value.substring(value.length - 2)}`;
        } else {
          result[key] = '***';
        }
      } else {
        result[key] = maskPII(value, depth + 1);
      }
    }
    return result;
  }

  return obj;
}

function formatLogEntry(
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>,
  requestId?: string,
  context?: string,
): string {
  const entry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    message,
    ...(requestId && { requestId }),
    ...(context && { context }),
    ...(meta && { meta: maskPII(meta) }),
  };

  return JSON.stringify(entry);
}

@Injectable()
export class StructuredLoggerService implements LoggerService {
  private context?: string;
  private readonly logger = new Logger(StructuredLoggerService.name);

  setContext(context: string): void {
    this.context = context;
  }

  log(message: string, context?: string, meta?: Record<string, unknown>, requestId?: string): void {
    if (!shouldLog('log')) return;
    console.log(formatLogEntry('log', message, meta, requestId, context || this.context));
  }

  error(message: string, trace?: string, context?: string, meta?: Record<string, unknown>, requestId?: string): void {
    if (!shouldLog('error')) return;
    console.error(formatLogEntry('error', message, { ...meta, stack: trace }, requestId, context || this.context));
  }

  warn(message: string, context?: string, meta?: Record<string, unknown>, requestId?: string): void {
    if (!shouldLog('warn')) return;
    console.warn(formatLogEntry('warn', message, meta, requestId, context || this.context));
  }

  debug(message: string, context?: string, meta?: Record<string, unknown>, requestId?: string): void {
    if (!shouldLog('debug')) return;
    console.debug(formatLogEntry('debug', message, meta, requestId, context || this.context));
  }

  verbose(message: string, context?: string, meta?: Record<string, unknown>, requestId?: string): void {
    if (!shouldLog('verbose')) return;
    console.log(formatLogEntry('verbose', message, meta, requestId, context || this.context));
  }

  fatal(message: string, trace?: string, context?: string, meta?: Record<string, unknown>, requestId?: string): void {
    if (!shouldLog('fatal')) return;
    console.error(formatLogEntry('fatal', message, { ...meta, stack: trace }, requestId, context || this.context));
  }

  createChildLogger(context: string): StructuredLoggerService {
    const child = new StructuredLoggerService();
    child.setContext(`${this.context || ''}:${context}`.replace(/^:/, ''));
    return child;
  }

  withRequestId(requestId: string): StructuredLoggerService {
    return new StructuredLoggerService();
  }

  logWithRequestId(
    level: LogLevel,
    message: string,
    requestId: string,
    meta?: Record<string, unknown>,
    context?: string,
  ): void {
    if (!shouldLog(level)) return;
    const entry = formatLogEntry(level, message, meta, requestId, context || this.context);
    switch (level) {
      case 'error':
      case 'fatal':
        console.error(entry);
        break;
      case 'warn':
        console.warn(entry);
        break;
      default:
        console.log(entry);
    }
  }
}