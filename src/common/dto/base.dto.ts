import { IsOptional, IsInt, Min, Max, IsEnum, IsString, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class SortDto {
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsString()
  sortBy?: string;
}

export class IdParamDto {
  @IsString()
  id: string;
}

export class SearchDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;
}