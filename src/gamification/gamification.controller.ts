import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  Patch,
  Body,
  Post,
  Delete,
  Param,
} from '@nestjs/common';
import { GamificationService } from './gamification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

interface RequestWithUser {
  user: {
    id: string;
    sub: string;
    role?: string;
  };
}

@Controller('gamification')
@UseGuards(JwtAuthGuard)
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Get('leaderboard')
  getLeaderboard(@Query('page') page?: string, @Query('limit') limit?: string) {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 20;
    return this.gamificationService.getLeaderboard(p, l);
  }

  @Get('me')
  getMyStats(@Request() req: RequestWithUser) {
    return this.gamificationService.getMyStats(req.user.sub);
  }

  @Get('config')
  getConfig() {
    return this.gamificationService.getConfig();
  }

  @Get('heatmap')
  getHeatmap(@Request() req: RequestWithUser) {
    return this.gamificationService.getHeatmap(req.user.sub);
  }

  @Get('weekly-progress')
  getWeeklyProgress(@Request() req: RequestWithUser) {
    return this.gamificationService.getWeeklyProgress(req.user.sub);
  }

  @Patch('weekly-goal')
  updateWeeklyGoal(
    @Request() req: RequestWithUser,
    @Body() body: { goal: number },
  ) {
    return this.gamificationService.updateWeeklyGoal(req.user.sub, body.goal);
  }

  @Get('badges')
  getBadges() {
    return this.gamificationService.getAllBadges();
  }

  @Get('my-badges')
  getMyBadges(@Request() req: RequestWithUser) {
    return this.gamificationService.getUserBadges(req.user.sub);
  }

  @Post('badges')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  createBadge(
    @Body()
    body: {
      name: string;
      description: string;
      icon?: string;
      condition?: string;
    },
  ) {
    return this.gamificationService.createBadge(body);
  }

  @Delete('badges/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  deleteBadge(@Param('id') id: string) {
    return this.gamificationService.deleteBadge(id);
  }
}
