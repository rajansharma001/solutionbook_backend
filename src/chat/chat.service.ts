import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async getConversations(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = { participants: { some: { userId } } };
    const [data, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        skip,
        take: limit,
        include: {
          participants: {
            include: {
              user: {
                select: { id: true, name: true, email: true, profileImage: true },
              },
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.conversation.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getContacts(userId: string) {
    const contactsMap = new Map<string, Record<string, unknown>>();

    // 1. Add all admins (Support)
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN', id: { not: userId } },
      select: {
        id: true, name: true, email: true, profileImage: true, role: true,
      },
    });
    admins.forEach((a) => contactsMap.set(a.id, { ...a, label: 'Support' }));

    // 2. Get user's role
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!currentUser) return [];

    // 3. If student, add teachers of enrolled courses
    if (currentUser.role === 'STUDENT' || currentUser.role === 'USER') {
      const enrollments = await this.prisma.enrollment.findMany({
        where: { studentId: userId },
        select: {
          course: {
            select: {
              teacher: {
                select: { id: true, name: true, email: true, profileImage: true, role: true },
              },
            },
          },
        },
      });
      enrollments.forEach((enr) => {
        const t = enr.course?.teacher;
        if (t && t.id !== userId) {
          contactsMap.set(t.id, { ...t, label: 'Teacher' });
        }
      });
    }

    // 4. If teacher, add students from their courses
    if (currentUser.role === 'TEACHER') {
      const courses = await this.prisma.course.findMany({
        where: { teacherId: userId },
        select: {
          enrollments: {
            select: {
              student: {
                select: { id: true, name: true, email: true, profileImage: true, role: true },
              },
            },
          },
        },
      });
      courses.forEach((course) => {
        course.enrollments.forEach((enr) => {
          const s = enr.student;
          if (s && s.id !== userId) {
            contactsMap.set(s.id, { ...s, label: 'Student' });
          }
        });
      });
    }

    return Array.from(contactsMap.values());
  }

  async getMessages(conversationId: string, userId: string, page = 1, limit = 50) {
    // Verify participant
    const participant = await this.prisma.participant.findFirst({
      where: { conversationId, userId },
    });
    if (!participant) return { data: [], total: 0, page, limit, totalPages: 0 };

    const skip = (page - 1) * limit;
    const where = { conversationId };
    const [data, total] = await Promise.all([
      this.prisma.chatMessage.findMany({
        where,
        skip,
        take: limit,
        include: {
          sender: {
            select: { id: true, name: true, email: true, profileImage: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.chatMessage.count({ where }),
    ]);
    return { data: data.reverse(), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async sendMessage(conversationId: string, senderId: string, content: string) {
    const participant = await this.prisma.participant.findFirst({
      where: { conversationId, userId: senderId },
    });
    if (!participant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    const message = await this.prisma.chatMessage.create({
      data: { conversationId, senderId, content },
      include: {
        sender: {
          select: { id: true, name: true, email: true, profileImage: true },
        },
      },
    });

    // Increment unread count for other participants
    await this.prisma.participant.updateMany({
      where: {
        conversationId,
        userId: { not: senderId },
      },
      data: {
        unreadCount: { increment: 1 },
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  async getOrCreateDM(userId: string, targetId: string) {
    // Find an existing DM conversation between the two users
    const existing = await this.prisma.conversation.findFirst({
      where: {
        isGroup: false,
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: targetId } } },
        ],
      },
      include: { participants: true },
    });

    if (existing) return existing;

    // Create new conversation
    return this.prisma.conversation.create({
      data: {
        isGroup: false,
        participants: {
          create: [{ userId }, { userId: targetId }],
        },
      },
      include: { participants: true },
    });
  }

  async getConversationById(id: string) {
    return this.prisma.conversation.findUnique({
      where: { id },
      include: { participants: true },
    });
  }

  async markAsRead(conversationId: string, userId: string) {
    await this.prisma.participant.updateMany({
      where: { conversationId, userId },
      data: { unreadCount: 0 },
    });
    return { success: true };
  }

  async getTotalUnreadCount(userId: string) {
    const participants = await this.prisma.participant.findMany({
      where: { userId },
      select: { unreadCount: true },
    });
    const total = participants.reduce((acc, p) => acc + p.unreadCount, 0);
    return { count: total };
  }
}
