import { Module } from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { ApiKeyController } from './api-key.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ApiKeyController],
  providers: [ApiKeyService, ApiKeyGuard],
  exports: [ApiKeyService, ApiKeyGuard],
})
export class ApiKeyModule {}
