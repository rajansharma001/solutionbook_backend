import { Exclude, Expose, Type } from 'class-transformer';

@Exclude()
export class ForumCategoryResponseDto {
  @Expose() id: string;
  @Expose() name: string;
  @Expose() slug: string;
  @Expose() description?: string;
  @Expose() icon?: string;
  @Expose() isPrivate: boolean;
  @Expose() createdAt: Date;
}

@Exclude()
export class ForumCommentResponseDto {
  @Expose() id: string;
  @Expose() content: string;
  @Expose() authorId: string;
  @Expose() postId: string;
  @Expose() parentId?: string;
  @Expose() upvotes: number;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
}

@Exclude()
export class ForumPostResponseDto {
  @Expose() id: string;
  @Expose() title: string;
  @Expose() content: string;
  @Expose() categoryId: string;
  @Expose() authorId: string;
  @Expose() courseId?: string;
  @Expose() views: number;
  @Expose() upvotes: number;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;

  @Expose()
  @Type(() => ForumCategoryResponseDto)
  category?: ForumCategoryResponseDto;

  @Expose()
  @Type(() => ForumCommentResponseDto)
  comments?: ForumCommentResponseDto[];
}
