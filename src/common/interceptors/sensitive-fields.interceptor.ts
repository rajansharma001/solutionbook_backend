import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

const SENSITIVE_FIELDS = new Set([
  'passwordHash',
  'password',
  'verificationToken',
  'verificationTokenExpires',
  'resetPasswordToken',
  'resetPasswordExpires',
  'failedLoginAttempts',
  'lockedUntil',
  'codeHash',
  'refreshToken',
]);

function stripFields(obj: unknown, depth = 0): unknown {
  if (depth > 10) return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => stripFields(item, depth + 1));
  }
  if (obj && typeof obj === 'object' && obj.constructor === Object) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (!SENSITIVE_FIELDS.has(key)) {
        result[key] = stripFields(value, depth + 1);
      }
    }
    return result;
  }
  return obj;
}

@Injectable()
export class SensitiveFieldsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => stripFields(data)),
    );
  }
}
