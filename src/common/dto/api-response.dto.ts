import { Exclude, Expose, Transform, Type } from 'class-transformer';

export class ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;

  constructor(data: T | null, message = 'OK', success = true) {
    this.success = success;
    this.message = message;
    this.data = data;
  }

  static ok<T>(data: T, message = 'OK'): ApiResponse<T> {
    return new ApiResponse(data, message, true);
  }

  static fail<T>(message: string, data: T | null = null): ApiResponse<T> {
    return new ApiResponse(data, message, false);
  }
}

export class PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  meta: PaginationMeta;

  constructor(data: T[], meta: PaginationMeta, message = 'OK') {
    this.success = true;
    this.message = message;
    this.data = data;
    this.meta = meta;
  }
}

export class PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;

  constructor(page: number, limit: number, total: number) {
    this.page = page;
    this.limit = limit;
    this.total = total;
    this.totalPages = Math.ceil(total / limit);
    this.hasNextPage = page < this.totalPages;
    this.hasPreviousPage = page > 1;
  }
}

export class IdResponse {
  id: string;

  constructor(id: string) {
    this.id = id;
  }
}
