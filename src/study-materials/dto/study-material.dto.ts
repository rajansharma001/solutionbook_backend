import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum StudyMaterialCategory {
  NOTE = 'NOTE',
  QUESTION_PAPER = 'QUESTION_PAPER',
}

export class CreateStudyMaterialDto {
  @IsString()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  fileUrl!: string;

  @IsEnum(StudyMaterialCategory, {
    message: 'Category must be either NOTE or QUESTION_PAPER',
  })
  category!: string;

  @IsString()
  classLevel!: string;

  @IsString()
  subject!: string;
}
