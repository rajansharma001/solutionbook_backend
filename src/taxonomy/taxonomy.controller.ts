import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { TaxonomyService } from './taxonomy.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('taxonomy')
export class TaxonomyController {
  constructor(private readonly taxonomyService: TaxonomyService) {}

  @Get('classes')
  async getClassLevels() {
    return this.taxonomyService.getClassLevels();
  }

  @Post('classes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async createClassLevel(@Body('name') name: string) {
    return this.taxonomyService.createClassLevel(name);
  }

  @Patch('classes/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async updateClassLevel(@Param('id') id: string, @Body('name') name: string) {
    return this.taxonomyService.updateClassLevel(id, name);
  }

  @Delete('classes/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async deleteClassLevel(@Param('id') id: string) {
    return this.taxonomyService.deleteClassLevel(id);
  }

  @Get('subjects')
  async getSubjects() {
    return this.taxonomyService.getSubjects();
  }

  @Post('subjects')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async createSubject(@Body('name') name: string) {
    return this.taxonomyService.createSubject(name);
  }

  @Patch('subjects/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async updateSubject(@Param('id') id: string, @Body('name') name: string) {
    return this.taxonomyService.updateSubject(id, name);
  }

  @Delete('subjects/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async deleteSubject(@Param('id') id: string) {
    return this.taxonomyService.deleteSubject(id);
  }

  @Get('programs')
  async getPrograms() {
    return this.taxonomyService.getPrograms();
  }

  @Post('programs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async createProgram(@Body('name') name: string) {
    return this.taxonomyService.createProgram(name);
  }

  @Patch('programs/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async updateProgram(@Param('id') id: string, @Body('name') name: string) {
    return this.taxonomyService.updateProgram(id, name);
  }

  @Delete('programs/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async deleteProgram(@Param('id') id: string) {
    return this.taxonomyService.deleteProgram(id);
  }
}
