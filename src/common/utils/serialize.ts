import { plainToInstance, ClassConstructor } from 'class-transformer';

export function toDto<T, V>(cls: ClassConstructor<T>, data: V): T {
  return plainToInstance(cls, data, {
    excludeExtraneousValues: false,
    enableImplicitConversion: true,
  });
}

export function toDtoArray<T, V>(cls: ClassConstructor<T>, data: V[]): T[] {
  return data.map((item) => toDto(cls, item));
}

export function toPaginatedDto<T, V>(
  cls: ClassConstructor<T>,
  data: V[],
  total: number,
  page: number,
  limit: number,
): { data: T[]; meta: { page: number; limit: number; total: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean } } {
  const totalPages = Math.ceil(total / limit);
  return {
    data: toDtoArray(cls, data),
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}
