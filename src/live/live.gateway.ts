import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { Logger } from '@nestjs/common';
import { WsSecurityService } from '../common/services/ws-security.service';
import { AuthenticatedSocketData } from '../common/types/authenticated-socket';

@WebSocketGateway({
  namespace: '/live',
})
export class LiveGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('LiveGateway');
  private activeConnections = new Map<
    string,
    { userId: string; liveClassId: string; joinedAt: Date }
  >();

  constructor(
    private prisma: PrismaService,
    private readonly wsSecurity: WsSecurityService,
  ) {}

  private getUser(client: Socket) {
    return (client.data as AuthenticatedSocketData).user;
  }

  async handleConnection(client: Socket) {
    const user = this.getUser(client);
    const userId = user?.sub;
    if (!userId) {
      this.logger.warn(
        `Client ${client.id} connected without authentication, disconnecting`,
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
        `Live connection rejected for user ${userId}: ${reason}`,
      );
      client.disconnect();
      return;
    }

    this.logger.log(
      `User ${userId} connected to live gateway with socket ${client.id}`,
    );
  }

  async handleDisconnect(client: Socket) {
    const connection = this.activeConnections.get(client.id);
    if (connection) {
      this.activeConnections.delete(client.id);
      const clientIp = client.handshake.address;
      void this.wsSecurity.removeConnection(clientIp, connection.userId);

      const leftAt = new Date();
      const durationSeconds = Math.floor(
        (leftAt.getTime() - connection.joinedAt.getTime()) / 1000,
      );

      try {
        await this.prisma.attendance.upsert({
          where: {
            liveClassId_userId: {
              liveClassId: connection.liveClassId,
              userId: connection.userId,
            },
          },
          update: {
            leftAt,
            duration: durationSeconds,
          },
          create: {
            userId: connection.userId,
            liveClassId: connection.liveClassId,
            joinedAt: connection.joinedAt,
            leftAt,
            duration: durationSeconds,
          },
        });
      } catch (error) {
        this.logger.error(
          `Failed to record attendance for user ${connection.userId}: ${(error as Error).message}`,
        );
      }

      this.server
        .to(connection.liveClassId)
        .emit('user_left', { userId: connection.userId });
    }

    const user = this.getUser(client);
    const userId = user?.sub;
    if (userId) {
      const clientIp = client.handshake.address;
      void this.wsSecurity.removeConnection(clientIp, userId);
    }
  }

  @SubscribeMessage('join_class')
  async handleJoinClass(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { liveClassId: string },
  ) {
    const user = this.getUser(client);
    const userId = user?.sub;
    const userName = user?.name || 'Unknown';
    if (!userId) return { status: 'error', message: 'Authentication required' };

    const { allowed } = await this.wsSecurity.checkRateLimit(
      userId,
      'join_class',
    );
    if (!allowed) {
      return {
        status: 'error',
        message: 'Rate limit exceeded. Please slow down.',
      };
    }

    if (!data?.liveClassId || typeof data.liveClassId !== 'string') {
      return { status: 'error', message: 'liveClassId is required' };
    }

    if (!this.wsSecurity.validateMessageSize(data)) {
      return { status: 'error', message: 'Message payload too large' };
    }

    // ── Authorisation: verify the user may attend this live class ──────────────
    const liveClass = await this.prisma.liveClass.findUnique({
      where: { id: data.liveClassId },
      include: { courseLinks: true },
    });

    if (!liveClass) {
      return { status: 'error', message: 'Live class not found' };
    }

    const userRole = user?.role ?? '';

    // Teachers of the class and admins can always join
    const isTeacher = liveClass.teacherId === userId;
    const isAdmin = userRole === 'ADMIN';

    if (!isTeacher && !isAdmin && liveClass.requireEnrollment) {
      // Collect all course IDs linked to this live class
      const linkedCourseIds = [
        liveClass.courseId,
        ...liveClass.courseLinks.map((lc) => lc.courseId),
      ].filter(Boolean);

      const enrollment = await this.prisma.enrollment.findFirst({
        where: {
          studentId: userId,
          courseId: { in: linkedCourseIds },
        },
      });

      if (!enrollment) {
        return {
          status: 'error',
          message: 'You must be enrolled in the course to join this live class',
        };
      }
    }

    void client.join(data.liveClassId);

    this.activeConnections.set(client.id, {
      userId,
      liveClassId: data.liveClassId,
      joinedAt: new Date(),
    });

    client.to(data.liveClassId).emit('user_joined', {
      userId,
      userName,
      timestamp: new Date(),
    });

    const history = await this.prisma.liveChatMessage.findMany({
      where: { liveClassId: data.liveClassId, isDeleted: false },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    const questions = await this.prisma.liveQuestion.findMany({
      where: { liveClassId: data.liveClassId },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { name: true } } },
    });

    client.emit('chat_history', history);
    client.emit('question_history', questions);

    return { status: 'joined' };
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      liveClassId: string;
      text: string;
    },
  ) {
    const user = this.getUser(client);
    const userId = user?.sub;
    const userName = user?.name || 'Unknown';
    if (!userId) return;

    const { allowed } = await this.wsSecurity.checkRateLimit(
      userId,
      'send_message',
      true,
    );
    if (!allowed) {
      client.emit('error', {
        message: 'Rate limit exceeded. Please slow down.',
      });
      return;
    }

    if (!this.wsSecurity.validateMessageSize(data)) {
      client.emit('error', { message: 'Message payload too large' });
      return;
    }

    const savedMsg = await this.prisma.liveChatMessage.create({
      data: {
        liveClassId: data.liveClassId,
        userId,
        userName,
        text: data.text,
      },
    });

    this.server.to(data.liveClassId).emit('new_message', savedMsg);
  }

  @SubscribeMessage('delete_message')
  async handleDeleteMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { messageId: string; liveClassId: string },
  ) {
    const user = this.getUser(client);
    const userId = user?.sub;
    const userRole = user?.role;
    if (!userId) return;

    const liveClass = await this.prisma.liveClass.findUnique({
      where: { id: data.liveClassId },
    });
    if (!liveClass || liveClass.teacherId !== userId) {
      if (userRole !== 'ADMIN') return;
    }

    await this.prisma.liveChatMessage.update({
      where: { id: data.messageId },
      data: { isDeleted: true },
    });

    this.server
      .to(data.liveClassId)
      .emit('message_deleted', { messageId: data.messageId });
  }

  @SubscribeMessage('ask_question')
  async handleAskQuestion(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      liveClassId: string;
      question: string;
      anonymous: boolean;
    },
  ) {
    const user = this.getUser(client);
    const userId = user?.sub;
    if (!userId) return;

    const { allowed } = await this.wsSecurity.checkRateLimit(
      userId,
      'ask_question',
      true,
    );
    if (!allowed) {
      client.emit('error', {
        message: 'Rate limit exceeded. Please slow down.',
      });
      return;
    }

    if (!this.wsSecurity.validateMessageSize(data)) {
      client.emit('error', { message: 'Message payload too large' });
      return;
    }

    const newQuestion = await this.prisma.liveQuestion.create({
      data: {
        liveClassId: data.liveClassId,
        userId,
        question: data.question,
        anonymous: data.anonymous,
      },
      include: { user: { select: { name: true } } },
    });

    this.server.to(data.liveClassId).emit('new_question', newQuestion);
  }

  @SubscribeMessage('answer_question')
  async handleAnswerQuestion(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { liveClassId: string; questionId: string; answer?: string },
  ) {
    const user = this.getUser(client);
    const userId = user?.sub;
    const userRole = user?.role;
    if (!userId) return;

    const liveClass = await this.prisma.liveClass.findUnique({
      where: { id: data.liveClassId },
    });
    if (!liveClass || liveClass.teacherId !== userId) {
      if (userRole !== 'ADMIN') return;
    }

    const updatedQ = await this.prisma.liveQuestion.update({
      where: { id: data.questionId },
      data: { isAnswered: true, answer: data.answer },
      include: { user: { select: { name: true } } },
    });

    this.server.to(data.liveClassId).emit('question_answered', updatedQ);
  }

  @SubscribeMessage('add_bookmark')
  async handleAddBookmark(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      liveClassId: string;
      timestamp: number;
      note: string;
    },
  ) {
    const user = this.getUser(client);
    const userId = user?.sub;
    if (!userId) return;

    const { allowed } = await this.wsSecurity.checkRateLimit(
      userId,
      'add_bookmark',
    );
    if (!allowed) {
      client.emit('error', { message: 'Rate limit exceeded' });
      return;
    }

    if (!this.wsSecurity.validateMessageSize(data)) {
      client.emit('error', { message: 'Payload too large' });
      return;
    }

    const bookmark = await this.prisma.liveBookmark.create({
      data: {
        liveClassId: data.liveClassId,
        userId,
        timestamp: data.timestamp,
        note: data.note,
      },
    });

    client.emit('bookmark_added', bookmark);
  }

  @SubscribeMessage('whiteboard_draw')
  async handleWhiteboardDraw(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { liveClassId: string; drawData: unknown },
  ) {
    const user = this.getUser(client);
    const userId = user?.sub;
    if (!userId) return;

    const { allowed } = await this.wsSecurity.checkRateLimit(
      userId,
      'whiteboard_draw',
    );
    if (!allowed) return;

    if (!this.wsSecurity.validateMessageSize(data)) {
      client.emit('error', { message: 'Payload too large' });
      return;
    }

    client.to(data.liveClassId).emit('whiteboard_draw', data.drawData);
  }

  @SubscribeMessage('whiteboard_clear')
  async handleWhiteboardClear(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { liveClassId: string },
  ) {
    const user = this.getUser(client);
    const userId = user?.sub;
    if (!userId) return;

    const { allowed } = await this.wsSecurity.checkRateLimit(
      userId,
      'whiteboard_clear',
    );
    if (!allowed) return;

    client.to(data.liveClassId).emit('whiteboard_clear');
  }

  @SubscribeMessage('draw_start')
  async handleDrawStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { liveClassId: string; [key: string]: unknown },
  ) {
    const user = this.getUser(client);
    if (!user?.sub) return;

    const { allowed } = await this.wsSecurity.checkRateLimit(user.sub, 'draw');
    if (!allowed) return;

    if (!this.wsSecurity.validateMessageSize(data)) {
      client.emit('error', { message: 'Payload too large' });
      return;
    }

    client.to(data.liveClassId).emit('draw_start', data);
  }

  @SubscribeMessage('draw_move')
  async handleDrawMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { liveClassId: string; [key: string]: unknown },
  ) {
    const user = this.getUser(client);
    if (!user?.sub) return;

    const { allowed } = await this.wsSecurity.checkRateLimit(user.sub, 'draw');
    if (!allowed) return;

    if (!this.wsSecurity.validateMessageSize(data)) {
      client.emit('error', { message: 'Payload too large' });
      return;
    }

    client.to(data.liveClassId).emit('draw_move', data);
  }

  @SubscribeMessage('draw_end')
  async handleDrawEnd(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { liveClassId: string; [key: string]: unknown },
  ) {
    const user = this.getUser(client);
    if (!user?.sub) return;

    const { allowed } = await this.wsSecurity.checkRateLimit(user.sub, 'draw');
    if (!allowed) return;

    client.to(data.liveClassId).emit('draw_end', data);
  }

  @SubscribeMessage('draw_clear')
  async handleDrawClear(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { liveClassId: string },
  ) {
    const user = this.getUser(client);
    if (!user?.sub) return;

    const { allowed } = await this.wsSecurity.checkRateLimit(user.sub, 'draw');
    if (!allowed) return;

    client.to(data.liveClassId).emit('draw_clear', data);
  }
}
