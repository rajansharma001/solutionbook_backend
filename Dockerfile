# =================================================================
# SikshyaHub Backend - Multi-stage Production Dockerfile
# =================================================================

# 1. Base / Dependencies stage
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install

# 2. Builder stage
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY tsconfig*.json ./
COPY prisma ./prisma/
COPY src ./src/

# Generate Prisma Client
RUN npx prisma generate

# Build NestJS distribution with allocated memory
ENV NODE_OPTIONS="--max_old_space_size=4096"
RUN npm run build

# Remove development dependencies for smaller final image
RUN npm prune --production

# 3. Production Runner stage
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production
ENV PORT=3000

# Create non-root system user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Create uploads directory and assign ownership
RUN mkdir -p /app/uploads && chown -R nestjs:nodejs /app/uploads

COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./

USER nestjs

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy || true; node dist/src/main"]
