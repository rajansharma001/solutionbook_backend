import { Controller, Post, Get, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { IsString, IsOptional, IsArray, MaxLength } from 'class-validator';

class CreateApiKeyDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];
}

@Controller('admin/api-keys')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post()
  async create(@Body() dto: CreateApiKeyDto) {
    const result = await this.apiKeyService.createApiKey(dto.name, dto.scopes);
    return {
      success: true,
      message: 'API key created. Store it securely - it will not be shown again.',
      data: result,
    };
  }

  @Get()
  async list() {
    const keys = await this.apiKeyService.listApiKeys();
    return { success: true, data: keys };
  }

  @Delete(':id')
  async revoke(@Param('id') id: string) {
    await this.apiKeyService.revokeApiKey(id);
    return { success: true, message: 'API key revoked' };
  }
}
