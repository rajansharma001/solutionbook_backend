import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface RequestWithUser {
  user: { sub: string };
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@Request() req: RequestWithUser) {
    return this.notificationsService.getUserNotifications(req.user.sub);
  }

  @Get('unread-count')
  unreadCount(@Request() req: RequestWithUser) {
    return this.notificationsService.getUnreadCount(req.user.sub);
  }

  @Patch('read-all')
  markAllRead(@Request() req: RequestWithUser) {
    return this.notificationsService.markAllRead(req.user.sub);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.notificationsService.markAsRead(id, req.user.sub);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.notificationsService.deleteNotification(id, req.user.sub);
  }
}
