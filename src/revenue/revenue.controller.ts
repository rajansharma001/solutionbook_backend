import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Patch,
  Param,
} from '@nestjs/common';
import { RevenueService } from './revenue.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

interface RequestWithUser {
  user: { sub: string; role: string };
}

@Controller('revenue')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RevenueController {
  constructor(private readonly revenueService: RevenueService) {}

  @Get('teacher-stats')
  @Roles('TEACHER', 'ADMIN')
  async getTeacherStats(@Request() req: RequestWithUser) {
    return this.revenueService.getTeacherStats(req.user.sub);
  }

  @Post('payouts')
  @Roles('TEACHER')
  async requestPayout(
    @Request() req: RequestWithUser,
    @Body('amount') amount: number,
  ) {
    return this.revenueService.requestPayout(req.user.sub, amount);
  }

  @Patch('payouts/:id/status')
  @Roles('ADMIN')
  async updatePayoutStatus(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.revenueService.updatePayoutStatus(req.user.sub, id, status);
  }

  @Patch('admin/instructor/:id/revenue-share')
  @Roles('ADMIN')
  async setRevenueShare(
    @Request() req: RequestWithUser,
    @Param('id') instructorId: string,
    @Body('share') share: number,
  ) {
    return this.revenueService.setRevenueShare(
      req.user.sub,
      instructorId,
      share,
    );
  }

  @Get('admin/instructors')
  @Roles('ADMIN')
  async getAdminInstructors() {
    return this.revenueService.getAdminInstructors();
  }
}
