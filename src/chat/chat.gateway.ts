import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ChatService } from './chat.service';
import { WsSecurityService } from '../common/services/ws-security.service';
import { AuthenticatedSocketData } from '../common/types/authenticated-socket';

@WebSocketGateway({
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger('ChatGateway');

  /** socketId → userId (populated from validated JWT payload only) */
  private connectedUsers = new Map<string, string>();

  constructor(
    private readonly chatService: ChatService,
    private readonly wsSecurity: WsSecurityService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    // The JWT middleware in AuthenticatedIoAdapter has already verified the
    // token and populated client.data.user.  NEVER fall back to query params
    // for identity — those can be trivially spoofed.
    const userData = client.data as AuthenticatedSocketData;
    const userId: string | undefined = userData.user?.sub;

    if (!userId) {
      this.logger.warn(
        `Chat connection rejected: no authenticated user for socket ${client.id}`,
      );
      client.disconnect();
      return;
    }

    const clientIp = client.handshake.address;
    const { allowed, reason } = await this.wsSecurity.checkConnectionAllowed(
      clientIp,
      userId,
    );
    if (!allowed) {
      this.logger.warn(
        `Chat connection rejected for user ${userId}: ${reason}`,
      );
      client.disconnect();
      return;
    }

    this.connectedUsers.set(client.id, userId);
    // Each user has a dedicated room for receiving direct messages
    void client.join(`user_${userId}`);
    this.logger.log(`User ${userId} connected to chat gateway [${client.id}]`);
  }

  handleDisconnect(client: Socket): void {
    const userId = this.connectedUsers.get(client.id);
    if (userId) {
      this.connectedUsers.delete(client.id);
      const clientIp = client.handshake.address;
      void this.wsSecurity.removeConnection(clientIp, userId);
      this.logger.log(
        `User ${userId} disconnected from chat gateway [${client.id}]`,
      );
    }
  }

  @SubscribeMessage('joinConversation')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userData = client.data as AuthenticatedSocketData;
    const userId = userData.user?.sub;
    if (!userId) return;

    const { allowed } = await this.wsSecurity.checkRateLimit(
      userId,
      'joinConversation',
    );
    if (!allowed) {
      client.emit('error', {
        message: 'Rate limit exceeded. Please slow down.',
      });
      return;
    }

    if (!data?.conversationId || typeof data.conversationId !== 'string') {
      return { event: 'error', data: 'conversationId is required' };
    }

    // Verify the user is actually a participant before joining the room
    const conv = await this.chatService.getConversationById(
      data.conversationId,
    );
    if (!conv) {
      return { event: 'error', data: 'Conversation not found' };
    }

    const isParticipant = conv.participants.some((p) => p.userId === userId);
    if (!isParticipant) {
      return {
        event: 'error',
        data: 'Not authorised to join this conversation',
      };
    }

    void client.join(`conv_${data.conversationId}`);
    return { event: 'joined', data: data.conversationId };
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; content: string },
  ) {
    const userData = client.data as AuthenticatedSocketData;
    const userId = userData.user?.sub;
    if (!userId) return;

    const { allowed } = await this.wsSecurity.checkRateLimit(
      userId,
      'sendMessage',
      true,
    );
    if (!allowed) {
      client.emit('error', {
        message: 'Rate limit exceeded. Please slow down.',
      });
      return;
    }

    if (!data?.conversationId || typeof data.conversationId !== 'string')
      return;
    if (!data.content || typeof data.content !== 'string') return;

    if (!this.wsSecurity.validateMessageSize(data)) {
      client.emit('error', { message: 'Message payload too large' });
      return;
    }

    // Verify sender is a conversation participant (IDOR prevention)
    const conv = await this.chatService.getConversationById(
      data.conversationId,
    );
    if (!conv) return;

    const isParticipant = conv.participants.some((p) => p.userId === userId);
    if (!isParticipant) {
      client.emit('error', {
        message: 'Not authorised to send to this conversation',
      });
      return;
    }

    const message = await this.chatService.sendMessage(
      data.conversationId,
      userId,
      data.content,
    );

    conv.participants.forEach((p) => {
      this.server.to(`user_${p.userId}`).emit('newMessage', message);
    });

    return message;
  }

  @SubscribeMessage('typing_start')
  async handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userData = client.data as AuthenticatedSocketData;
    const userId = userData.user?.sub;
    if (!userId || !data?.conversationId) return;

    const { allowed } = await this.wsSecurity.checkRateLimit(userId, 'typing');
    if (!allowed) return;

    const conv = await this.chatService.getConversationById(
      data.conversationId,
    );
    if (!conv) return;

    const isParticipant = conv.participants.some((p) => p.userId === userId);
    if (!isParticipant) return;

    conv.participants.forEach((p) => {
      if (p.userId !== userId) {
        this.server.to(`user_${p.userId}`).emit('typingStart', {
          conversationId: data.conversationId,
          userId,
        });
      }
    });
  }

  @SubscribeMessage('typing_end')
  async handleTypingEnd(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userData = client.data as AuthenticatedSocketData;
    const userId = userData.user?.sub;
    if (!userId || !data?.conversationId) return;

    const { allowed } = await this.wsSecurity.checkRateLimit(userId, 'typing');
    if (!allowed) return;

    const conv = await this.chatService.getConversationById(
      data.conversationId,
    );
    if (!conv) return;

    const isParticipant = conv.participants.some((p) => p.userId === userId);
    if (!isParticipant) return;

    conv.participants.forEach((p) => {
      if (p.userId !== userId) {
        this.server
          .to(`user_${p.userId}`)
          .emit('typingEnd', { conversationId: data.conversationId, userId });
      }
    });
  }

  /** Called by other services (e.g. ChatService) to push a message to all participants. */
  async broadcastNewMessage(message: {
    conversationId: string;
    [key: string]: unknown;
  }) {
    const conv = await this.chatService.getConversationById(
      message.conversationId,
    );
    if (conv) {
      conv.participants.forEach((p) => {
        this.server.to(`user_${p.userId}`).emit('newMessage', message);
      });
    }
  }
}
