import { Exclude, Expose, Type } from 'class-transformer';

@Exclude()
export class MessageResponseDto {
  @Expose() id: string;
  @Expose() content: string;
  @Expose() senderId: string;
  @Expose() conversationId: string;
  @Expose() seenBy: string;
  @Expose() createdAt: Date;

  @Expose() sender?: {
    id: string;
    name?: string;
    profileImage?: string;
  };
}

@Exclude()
export class ConversationResponseDto {
  @Expose() id: string;
  @Expose() title?: string;
  @Expose() isGroup: boolean;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;

  @Expose()
  @Type(() => MessageResponseDto)
  messages?: MessageResponseDto[];
}
