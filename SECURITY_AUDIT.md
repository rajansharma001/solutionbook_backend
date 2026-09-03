# Security Audit Report — SolutionBook Backend
**Date:** 2026-06-28  
**Auditor:** Principal Backend Security Engineer (automated)  
**Scope:** Full NestJS LMS backend — all controllers, services, gateways, DTOs, config

---

## Summary

12 security fix categories were identified and remediated. All changes are live in the source tree.

---

## Fix 1 — `main.ts` Production Hardening ✅

| Before | After |
|--------|-------|
| Missing `compression()` | `compression()` added |
| `forbidNonWhitelisted` missing in ValidationPipe | Added: `whitelist:true, forbidNonWhitelisted:true, transform:true` |
| CORS allowed all LAN IPs unconditionally | LAN IP bypass restricted to `NODE_ENV !== 'production'` only |
| Swagger always exposed | Swagger only in `NODE_ENV !== 'production'` |
| CSP had `unsafe-eval` for scripts | Removed `unsafe-eval` |
| HSTS not configured | Added HSTS in production (max-age 1 year, preload) |
| JWT_SECRET read at module parse time | Moved to `JwtModule.registerAsync` + validated at startup |
| No startup environment gate | `assertEnvironment()` exits the process if config is invalid |

---

## Fix 2 — Auth Service Hardening ✅

| Issue | Fix |
|-------|-----|
| No account lockout — unlimited brute-force | Lockout after 5 failed attempts, 15 min duration |
| Failed attempt counter not reset on success | Counter cleared on successful login and OTP verify |
| JWT_SECRET not validated at runtime | Validated in `AuthService` constructor and `auth.module.ts` |
| Password not validated against timing attacks when user not found | Added constant-time dummy `bcrypt.compare` for non-existent users |
| `resetPassword` didn't clear lockout | Lockout cleared on successful password reset |

**Schema change:** Added `failedLoginAttempts Int @default(0)` and `lockedUntil DateTime?` to `User` model + manual migration SQL.

---

## Fix 3 — Authorization Guard Audit ✅

| Issue | Fix |
|-------|-----|
| `JwtModule.register` used `process.env.JWT_SECRET` synchronously | Changed to `JwtModule.registerAsync` |
| `auth.module.ts` didn't validate JWT_SECRET length | Throws on startup if < 32 chars |
| Live gateway join_class: any authenticated user could join any room | Added enrollment check before joining |
| `GET /courses` had no pagination — full table scan | Added `page`/`limit`/`status` params, capped at 100 |
| `PATCH /users/me` accepted `Record<string, unknown>` | Replaced with typed `UpdateProfileDto` with `ValidateNested` |

---

## Fix 4 — IDOR Prevention ✅

| Endpoint | Issue | Fix |
|----------|-------|-----|
| `GET /media/:id` | Any authenticated user could read metadata of any media | Added ownership check (owner or ADMIN only) |
| `chat.gateway joinConversation` | User could join any conversation by ID | Added participant membership check |
| `chat.gateway sendMessage` | User could send to any conversation by ID | Added participant membership check before writing |
| `live.gateway join_class` | Any authenticated user could join any live class | Added enrollment check for `requireEnrollment` classes |
| Bookmarks | Already owner-scoped ✅ | No change needed |
| Payments `GET /payments/:id` | Already owner-scoped ✅ | No change needed |

---

## Fix 5 — DTO Validation ✅

| DTO | Changes |
|-----|---------|
| `RegisterDto` | Added `@MaxLength(254)` email, `@MaxLength(128)` password, `@MaxLength(100)` name |
| `ResetPasswordDto` | Added `@MaxLength(256)` token, `@MaxLength(128)` password |
| `RequestOtpDto` | Changed `purpose` from free string to `@IsIn(OtpPurpose[])` enum validation |
| `VerifyOtpDto` | Added `@Length(6,6)` on `code`, purpose now enum-validated |
| `CreatePaymentDto` | Changed `courseId/studyMaterialId` to `@IsUUID()`, added `@IsPositive()` on amount, `@IsIn([...])` on paymentMethod, `@MaxLength(2048)` on receiptUrl |
| `UpdateProfileDto` (new) | Added typed DTO replacing `Record<string,unknown>` body |
| `update-profile.dto.ts` | Added `@MaxLength()` on all string fields |

---

## Fix 6 — Response Sanitization ✅

| Issue | Fix |
|-------|-----|
| `users.service.findAll()` returned full `User` row including `passwordHash`, `resetPasswordToken`, etc. | Added explicit `select:{}` with safe fields only; added pagination |
| `getProfile()` already uses `select:{}` ✅ | No change |
| `getPublicProfile()` already uses `select:{}` ✅ | No change |
| Auth login/OTP responses manually omit sensitive fields ✅ | No change |

---

## Fix 7 — WebSocket Security ✅

| Gateway | Issue | Fix |
|---------|-------|-----|
| `chat.gateway` | `userId` was derived from `socket.handshake.query.userId` — trivially spoofable | Removed entirely; identity now comes exclusively from JWT payload in `client.data.user.sub` |
| `chat.gateway` | Unauthenticated sockets were stored in `connectedUsers` map | `handleConnection` disconnects if `userId` is falsy |
| `live.gateway` | `join_class` allowed any valid JWT to join any room | Added enrollment/teacher/admin check |
| All gateways | JWT middleware applied globally in `AuthenticatedIoAdapter` ✅ | No change needed |
| `notifications.gateway` | Already disconnects unauthenticated sockets ✅ | No change needed |

---

## Fix 8 — File Upload Security ✅

| Issue | Fix |
|-------|-----|
| MIME type only validated from browser-reported `Content-Type` | Added **magic-byte verification** by reading file header after save |
| No check for dangerous extensions | Added `BLOCKED_EXTENSIONS` set (exe, sh, php, js, py, etc.) |
| `file.originalname` used as-is in DB | Added `sanitizeFilename()` — strips path traversal, null bytes, metacharacters |
| File size for regular users was 5 MB | Raised to 10 MB per spec |
| Large upload endpoint lacked ownership check on GET | Added ownership check on `GET /media/:id` |
| SVG uploads could contain embedded JS | SVG text-based detection (contents checked for `<svg`/`<?xml`) |

---

## Fix 9 — Rate Limiting ✅

| Endpoint | Before | After |
|----------|--------|-------|
| `POST /auth/request-otp` | 3/min ✅ | 3/min ✅ |
| `POST /auth/verify-otp` | 10/min (too loose) | 5/min |
| `POST /auth/login` | 5/min ✅ | 5/min ✅ |
| `POST /auth/register` | 5/min ✅ | 5/min ✅ |
| Global throttler | 200 req/min (loose) | Unchanged (application-level) |

---

## Fix 10 — Exception Handling ✅

| Issue | Fix |
|-------|-----|
| Stack traces could leak in production | `IS_PRODUCTION` guard — stack only logged internally, never in response body |
| No `requestId` for correlation | Every response now includes a `requestId` (UUID) |
| Error shape inconsistent | Standardized: `{ success, statusCode, error, message, requestId, timestamp }` |
| Logging interceptor had no requestId | Added `requestId` attached to `req.requestId`; logged with every request |

---

## Fix 11 — Environment Config Validation ✅

**New file:** `src/config/config.validation.ts`

- Uses `class-validator` + `plainToInstance` to validate env vars at startup
- Required: `DATABASE_URL`, `JWT_SECRET` (min 32 chars)
- Optional with type checking: `PORT` (1–65535), `FRONTEND_URL`, SMTP vars
- `AppModule` passes `validate: validateConfig` to `ConfigModule.forRoot()`
- `main.ts` calls `assertEnvironment()` before NestJS even creates the app; exits with code 1 if validation fails

---

## Fix 12 — Prisma Security ✅

| Issue | Fix |
|-------|-----|
| `courses.service.findAll()` was unbounded `findMany()` — full table scan | Added `page`, `limit` (capped at 100), `status` filter |
| `admin.service.$queryRaw` calls | Reviewed — all use Prisma tagged-template syntax (`$queryRaw\`...\``) which is parameterized. No string concatenation. ✅ Safe. |
| `users.service.findAll()` was unbounded | Added `page`, `limit`, safe `select` |

---

## Remaining Recommendations (not auto-fixed)

1. **Run `prisma migrate dev`** to apply the `failedLoginAttempts`/`lockedUntil` migration.
2. **Set `NODE_ENV=production`** in your production `.env` to enable HSTS, disable Swagger, and suppress stack traces.
3. **Generate proper secrets:** `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` for both `JWT_SECRET` and `JWT_REFRESH_SECRET`.
4. **File upload path:** Serve `/uploads` from a CDN or object storage (S3/R2) in production — direct disk serving is not recommended at scale.
5. **Content Security Policy:** The current CSP allows `img-src: https:` which is broad. In production, tighten to specific domains.
6. **Audit dependencies:** `npm audit` reports 32 vulnerabilities (2 low, 18 moderate, 12 high). Run `npm audit fix` to address non-breaking ones.
7. **HTTPS enforcement:** Ensure your reverse proxy (nginx/Caddy) redirects HTTP→HTTPS. HSTS in the app only works when TLS is terminated at the app level.
