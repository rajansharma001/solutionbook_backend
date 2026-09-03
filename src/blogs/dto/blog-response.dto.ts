import { Exclude, Expose, Type } from 'class-transformer';

@Exclude()
export class BlogCategoryResponseDto {
  @Expose() id: string;
  @Expose() name: string;
  @Expose() slug: string;
  @Expose() description?: string;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
}

@Exclude()
export class BlogPostResponseDto {
  @Expose() id: string;
  @Expose() slug: string;
  @Expose() title: string;
  @Expose() excerpt?: string;
  @Expose() content: string;
  @Expose() thumbnail?: string;
  @Expose() published: boolean;
  @Expose() authorId: string;
  @Expose() categoryId?: string;
  @Expose() tags: string;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;

  @Expose()
  @Type(() => BlogCategoryResponseDto)
  category?: BlogCategoryResponseDto;
}
