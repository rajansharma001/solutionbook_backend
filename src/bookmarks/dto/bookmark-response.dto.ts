import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class BookmarkResponseDto {
  @Expose() id: string;
  @Expose() userId: string;
  @Expose() lessonId: string;
  @Expose() timestamp: number;
  @Expose() note?: string;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
}
