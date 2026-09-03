import { Controller, Get, Query, Redirect } from '@nestjs/common';
import { YoutubeService } from './youtube.service';
import { ConfigService } from '@nestjs/config';

@Controller('api/live')
export class YoutubeCallbackController {
  constructor(
    private readonly youtubeService: YoutubeService,
    private readonly configService: ConfigService,
  ) {}

  @Get('youtube/callback')
  @Redirect()
  async callback(
    @Query('code') code: string,
    @Query('state') stateParam: string,
  ) {
    let userId = stateParam;
    let returnUrl = '/teacher/dashboard/live/create';
    try {
      const stateObj = JSON.parse(stateParam) as Record<string, string>;
      userId = stateObj.userId;
      if (stateObj.returnUrl) returnUrl = stateObj.returnUrl;
    } catch {}

    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3001',
    );

    try {
      if (!code) {
        return { url: `${frontendUrl}${returnUrl}?error=access_denied` };
      }
      await this.youtubeService.handleCallback(code, userId);
      return { url: `${frontendUrl}${returnUrl}?success=youtube_connected` };
    } catch {
      return { url: `${frontendUrl}${returnUrl}?error=youtube_auth_failed` };
    }
  }
}
