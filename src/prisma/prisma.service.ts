import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl || dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) {
      if (process.env.NODE_ENV === 'production') {
        this.logger.warn(
          '⚠️ DATABASE_URL is missing or pointing to localhost in a production container! ' +
          'Please set your PostgreSQL DATABASE_URL in your Render dashboard environment variables.'
        );
      }
    }
    try {
      await this.$connect();
      this.logger.log('✅ PostgreSQL database connection established successfully.');
    } catch (error) {
      this.logger.error('❌ Could not connect to PostgreSQL database.', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
