import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatGateway } from './chat.gateway';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Get('conversations')
  getConversations(
    @Request() req: { user: { sub: string } },
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.chatService.getConversations(req.user.sub, page, limit);
  }

  @Get('contacts')
  getContacts(@Request() req: { user: { sub: string } }) {
    return this.chatService.getContacts(req.user.sub);
  }

  @Get('conversations/:id/messages')
  getMessages(
    @Param('id') id: string,
    @Request() req: { user: { sub: string } },
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.chatService.getMessages(id, req.user.sub, page, limit);
  }

  @Post('conversations/:id/messages')
  async sendMessage(
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @Request() req: { user: { sub: string } },
  ) {
    const msg = await this.chatService.sendMessage(id, req.user.sub, dto.content);
    this.chatGateway.broadcastNewMessage(msg);
    return msg;
  }

  @Post('dm/:targetId')
  getOrCreateDM(@Param('targetId') targetId: string, @Request() req: { user: { sub: string } }) {
    return this.chatService.getOrCreateDM(req.user.sub, targetId);
  }

  @Post('conversations/:id/read')
  markAsRead(@Param('id') id: string, @Request() req: { user: { sub: string } }) {
    return this.chatService.markAsRead(id, req.user.sub);
  }

  @Get('unread-count')
  getUnreadCount(@Request() req: { user: { sub: string } }) {
    return this.chatService.getTotalUnreadCount(req.user.sub);
  }
}
