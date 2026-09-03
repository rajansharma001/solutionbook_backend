export interface Repository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  exists(id: ID): Promise<boolean>;
  count(): Promise<number>;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
