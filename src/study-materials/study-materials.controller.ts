import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StudyMaterialsService } from './study-materials.service';
import { CreateStudyMaterialDto } from './dto/study-material.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('study-materials')
export class StudyMaterialsController {
  constructor(private readonly studyMaterialsService: StudyMaterialsService) {}

  @Get()
  findAll(
    @Query('category') category?: string,
    @Query('classLevel') classLevel?: string,
    @Query('subject') subject?: string,
    @Query('search') search?: string,
  ) {
    return this.studyMaterialsService.findAll({
      category,
      classLevel,
      subject,
      search,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  @Get('teacher/my-materials')
  getMyMaterials() {
    return this.studyMaterialsService.findAll({});
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.studyMaterialsService.findOne(id);
  }

  @Post(':id/download')
  incrementDownload(@Param('id') id: string) {
    return this.studyMaterialsService.incrementDownload(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'TEACHER')
  @Post()
  create(@Body() dto: CreateStudyMaterialDto) {
    return this.studyMaterialsService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'TEACHER')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.studyMaterialsService.remove(id);
  }
}
