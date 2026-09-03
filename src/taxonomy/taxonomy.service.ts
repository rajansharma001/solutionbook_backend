import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TaxonomyService {
  constructor(private readonly prisma: PrismaService) {}

  async getClassLevels() {
    return this.prisma.classLevel.findMany({ orderBy: { name: 'asc' } });
  }

  async createClassLevel(name: string) {
    try {
      return await this.prisma.classLevel.create({ data: { name } });
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      )
        throw new ConflictException('Class level already exists');
      throw new InternalServerErrorException('Failed to create class level');
    }
  }

  async updateClassLevel(id: string, name: string) {
    try {
      return await this.prisma.classLevel.update({
        where: { id },
        data: { name },
      });
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      )
        throw new ConflictException('Class level already exists');
      throw new InternalServerErrorException('Failed to update class level');
    }
  }

  async deleteClassLevel(id: string) {
    return this.prisma.classLevel.delete({ where: { id } });
  }

  async getSubjects() {
    return this.prisma.subject.findMany({ orderBy: { name: 'asc' } });
  }

  async createSubject(name: string) {
    try {
      return await this.prisma.subject.create({ data: { name } });
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      )
        throw new ConflictException('Subject already exists');
      throw new InternalServerErrorException('Failed to create subject');
    }
  }

  async updateSubject(id: string, name: string) {
    try {
      return await this.prisma.subject.update({
        where: { id },
        data: { name },
      });
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      )
        throw new ConflictException('Subject already exists');
      throw new InternalServerErrorException('Failed to update subject');
    }
  }

  async deleteSubject(id: string) {
    return this.prisma.subject.delete({ where: { id } });
  }

  async getPrograms() {
    return this.prisma.program.findMany({ orderBy: { name: 'asc' } });
  }

  async createProgram(name: string) {
    try {
      return await this.prisma.program.create({ data: { name } });
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      )
        throw new ConflictException('Program already exists');
      throw new InternalServerErrorException('Failed to create program');
    }
  }

  async updateProgram(id: string, name: string) {
    try {
      return await this.prisma.program.update({
        where: { id },
        data: { name },
      });
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      )
        throw new ConflictException('Program already exists');
      throw new InternalServerErrorException('Failed to update program');
    }
  }

  async deleteProgram(id: string) {
    return this.prisma.program.delete({ where: { id } });
  }
}
