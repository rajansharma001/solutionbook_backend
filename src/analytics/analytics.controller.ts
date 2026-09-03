import { Controller, Get, Param, UseGuards, Post, Body } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  getOverview() {
    return this.analyticsService.getPlatformOverview();
  }

  @Get('courses/:courseId/funnel')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'TEACHER')
  getCourseFunnel(@Param('courseId') courseId: string) {
    return this.analyticsService.getCourseFunnel(courseId);
  }

  @Post('track-view')
  trackLessonView(@Body() body: { lessonId: string; watchTime: number }) {
    return this.analyticsService.trackLessonView(body.lessonId, body.watchTime);
  }
}
