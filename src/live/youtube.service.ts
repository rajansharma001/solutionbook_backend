import {
  Injectable,
  Logger,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { google } from 'googleapis';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';

@Injectable()
export class YoutubeService {
  private readonly logger = new Logger(YoutubeService.name);
  private oauth2Client;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get<string>('YOUTUBE_CLIENT_ID', 'placeholder_id'),
      this.configService.get<string>(
        'YOUTUBE_CLIENT_SECRET',
        'placeholder_secret',
      ),
      this.configService.get<string>(
        'YOUTUBE_REDIRECT_URI',
        'http://localhost:3000/api/live/youtube/callback',
      ),
    );
  }

  generateAuthUrl(state: string) {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/youtube.force-ssl'],
      state,
      prompt: 'consent',
    });
  }

  async isConnected(userId: string): Promise<boolean> {
    const account = await this.prisma.socialAccount.findFirst({
      where: { provider: 'YOUTUBE', user: { role: 'ADMIN' } },
    });
    return !!(account && account.accessToken);
  }

  async handleCallback(code: string, userId: string) {
    try {
      this.logger.log(`YouTube callback: exchanging code for userId=${userId}`);
      this.logger.log(
        `Using redirect URI: ${this.configService.get<string>('YOUTUBE_REDIRECT_URI', 'http://localhost:3000/live/youtube/callback')}`,
      );
      this.logger.log(
        `Client ID starts with: ${(this.configService.get<string>('YOUTUBE_CLIENT_ID', '') || '').substring(0, 20)}...`,
      );

      const { tokens } = await this.oauth2Client.getToken(code);
      this.logger.log(
        `Got tokens: access_token=${!!tokens.access_token}, refresh_token=${!!tokens.refresh_token}`,
      );

      // Store or update the SocialAccount in DB
      const existingAccount = await this.prisma.socialAccount.findFirst({
        where: { userId, provider: 'YOUTUBE' },
      });

      if (existingAccount) {
        await this.prisma.socialAccount.update({
          where: { id: existingAccount.id },
          data: {
            accessToken: tokens.access_token || '',
            refreshToken: tokens.refresh_token || existingAccount.refreshToken,
          },
        });
      } else {
        await this.prisma.socialAccount.create({
          data: {
            userId,
            provider: 'YOUTUBE',
            accessToken: tokens.access_token || '',
            refreshToken: tokens.refresh_token || '',
          },
        });
      }
      this.logger.log('YouTube authentication successful');
      return true;
    } catch (error: unknown) {
      const err = error as {
        name?: string;
        message?: string;
        response?: { data?: unknown };
      };
      this.logger.error('Failed to handle YouTube callback');
      this.logger.error(`Error name: ${err?.name}`);
      this.logger.error(`Error message: ${err?.message}`);
      this.logger.error(
        `Error response: ${JSON.stringify(err?.response?.data || err?.response || {})}`,
      );
      throw new InternalServerErrorException(
        `Failed to authenticate with YouTube: ${err?.message || 'Unknown error'}`,
      );
    }
  }

  private async getYoutubeClient(userId: string) {
    const account = await this.prisma.socialAccount.findFirst({
      where: { provider: 'YOUTUBE', user: { role: 'ADMIN' } },
    });

    if (!account) {
      throw new UnauthorizedException('YouTube account not connected');
    }

    const client = new google.auth.OAuth2(
      this.configService.get<string>('YOUTUBE_CLIENT_ID', 'placeholder_id'),
      this.configService.get<string>(
        'YOUTUBE_CLIENT_SECRET',
        'placeholder_secret',
      ),
    );

    client.setCredentials({
      access_token: account.accessToken,
      refresh_token: account.refreshToken,
    });

    client.on('tokens', (tokens) => {
      void (async () => {
        if (tokens.refresh_token) {
          await this.prisma.socialAccount.update({
            where: { id: account.id },
            data: {
              accessToken: tokens.access_token || '',
              refreshToken: tokens.refresh_token || '',
            },
          });
        } else {
          await this.prisma.socialAccount.update({
            where: { id: account.id },
            data: { accessToken: tokens.access_token || '' },
          });
        }
      })();
    });

    return google.youtube({ version: 'v3', auth: client });
  }

  async createLiveStream(userId: string, title: string, description: string) {
    try {
      const youtube = await this.getYoutubeClient(userId);

      // 1. Create Broadcast
      const broadcastResponse = await youtube.liveBroadcasts.insert({
        part: ['snippet', 'status', 'contentDetails'],
        requestBody: {
          snippet: {
            title,
            description,
            scheduledStartTime: new Date().toISOString(),
          },
          status: {
            privacyStatus: 'unlisted', // Private inside SolutionBook only
            selfDeclaredMadeForKids: false,
          },
          contentDetails: {
            enableAutoStart: true,
            enableAutoStop: true,
            monitorStream: { enableMonitorStream: false },
          },
        },
      });

      const broadcast = broadcastResponse.data;

      // 2. Create Stream (RTMP)
      const streamResponse = await youtube.liveStreams.insert({
        part: ['snippet', 'cdn'],
        requestBody: {
          snippet: {
            title: `${title} - Stream`,
          },
          cdn: {
            frameRate: '60fps',
            ingestionType: 'rtmp',
            resolution: '1080p',
          },
        },
      });

      const stream = streamResponse.data;

      // 3. Bind Broadcast to Stream
      await youtube.liveBroadcasts.bind({
        id: broadcast.id as string,
        part: ['id', 'contentDetails'],
        streamId: stream.id as string,
      });

      return {
        youtubeLiveId: broadcast.id, // ID to embed player
        streamKey: stream.cdn?.ingestionInfo?.streamName, // Key for OBS
        rtmpUrl: stream.cdn?.ingestionInfo?.ingestionAddress, // RTMP URL
      };
    } catch (error: unknown) {
      const err = error as { message?: string };
      this.logger.error('Failed to create YouTube stream', error);
      throw new InternalServerErrorException(
        'Failed to create YouTube stream: ' + (err.message || 'Unknown error'),
      );
    }
  }

  async uploadVideo(userId: string, title: string, description: string, filePath: string) {
    try {
      const youtube = await this.getYoutubeClient(userId);

      this.logger.log(`Starting video upload to YouTube: ${title}`);

      const res = await youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title,
            description,
          },
          status: {
            privacyStatus: 'unlisted', // Private/Unlisted for courses
            selfDeclaredMadeForKids: false,
          },
        },
        media: {
          body: fs.createReadStream(filePath),
        },
      });

      this.logger.log(`Upload complete. Video ID: ${res.data.id}`);

      return {
        videoId: res.data.id,
        url: `https://youtu.be/${res.data.id}`,
      };
    } catch (error: unknown) {
      const err = error as { message?: string };
      this.logger.error('Failed to upload video to YouTube', error);
      throw new InternalServerErrorException(
        'Failed to upload video to YouTube: ' + (err.message || 'Unknown error'),
      );
    }
  }
}
