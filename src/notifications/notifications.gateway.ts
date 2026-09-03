import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { WsSecurityService } from '../common/services/ws-security.service';
import { AuthenticatedSocketData } from '../common/types/authenticated-socket';

@WebSocketGateway({
  namespace: '/notifications',
})
@Injectable()
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('NotificationsGateway');
  private userSockets = new Map<string, Set<string>>(); // userId -> Set<socketId>

  private getUser(client: Socket) {
    return (client.data as AuthenticatedSocketData).user;
  }

  constructor(private readonly wsSecurity: WsSecurityService) {}

  async handleConnection(client: Socket) {
    const user = this.getUser(client);
    const userId = user?.sub;
    if (userId) {
      const clientIp = client.handshake.address;
      const { allowed, reason } = await this.wsSecurity.checkConnectionAllowed(
        clientIp,
        userId,
      );
      if (!allowed) {
        this.logger.warn(
          `Notifications connection rejected for user ${userId}: ${reason}`,
        );
        client.disconnect();
        return;
      }

      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);
      this.logger.log(`User ${userId} connected with socket ${client.id}`);
    } else {
      this.logger.warn(`Client ${client.id} connected without authentication`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    for (const [userId, socketIds] of this.userSockets.entries()) {
      if (socketIds.delete(client.id)) {
        if (socketIds.size === 0) {
          this.userSockets.delete(userId);
        }
        const clientIp = client.handshake.address;
        void this.wsSecurity.removeConnection(clientIp, userId);
        break;
      }
    }
  }

  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channel: string },
  ) {
    const user = this.getUser(client);
    const userId = user?.sub;
    if (!userId) return { status: 'error', message: 'Authentication required' };

    const { allowed } = await this.wsSecurity.checkRateLimit(
      userId,
      'subscribe',
    );
    if (!allowed) {
      return { status: 'error', message: 'Rate limit exceeded' };
    }

    // Join a channel-specific room (e.g., 'course_123', 'global')
    if (data?.channel) {
      void client.join(data.channel);
      return { status: 'subscribed', channel: data.channel };
    }
    return { status: 'error', message: 'Channel is required' };
  }

  sendNotificationToUser(
    userId: string,
    notification: Record<string, unknown>,
  ) {
    const socketIds = this.userSockets.get(userId);
    if (socketIds && socketIds.size > 0) {
      for (const socketId of socketIds) {
        void this.server.to(socketId).emit('notification.new', notification);
      }
    }
  }

  sendNotificationToAll(notification: Record<string, unknown>) {
    this.server.emit('notification.new', notification);
  }
}
