import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Ensure the uploads directory exists in backend roots
  const uploadsDir = join(__dirname, '..', 'uploads');
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) {
        callback(null, true);
        return;
      }
      
      const allowedOrigins = [
        'http://localhost:3001',
        'http://127.0.0.1:3001',
      ];
      
      const envOrigin = (process.env.FRONTEND_URL || '').replace(/['"]/g, '');
      if (envOrigin) {
        allowedOrigins.push(envOrigin);
      }
      
      const isAllowed = allowedOrigins.includes(origin) || 
                        origin.startsWith('http://localhost:') || 
                        origin.startsWith('http://127.0.0.1:');
                        
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Accept,Authorization,X-Requested-With',
  });
  app.use('/uploads', express.static(uploadsDir));
  
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((err) => {
  console.error('Error starting application', err);
});

