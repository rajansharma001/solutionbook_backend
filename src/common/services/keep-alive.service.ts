import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as https from 'https';
import * as http from 'http';

@Injectable()
export class KeepAliveService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KeepAliveService.name);
  private intervalRef: NodeJS.Timeout | null = null;

  onModuleInit() {
    // Render automatically provides RENDER_EXTERNAL_URL (e.g. https://solutionbook-backend.onrender.com)
    const targetUrl = process.env.RENDER_EXTERNAL_URL || process.env.KEEP_ALIVE_URL;

    if (!targetUrl) {
      this.logger.log('KeepAliveService: No RENDER_EXTERNAL_URL or KEEP_ALIVE_URL found. Self-ping is inactive locally.');
      return;
    }

    const pingUrl = targetUrl.endsWith('/') ? `${targetUrl}health` : `${targetUrl}/health`;
    this.logger.log(`🚀 KeepAliveService activated! Target: ${pingUrl}. Pinging every 10 minutes to prevent Render from sleeping.`);

    // Initial ping after 45 seconds once server is fully booted
    setTimeout(() => {
      this.pingServer(pingUrl);
    }, 45000);

    // Recurring ping every 10 minutes (Render sleeps after 15 minutes of inactivity)
    const tenMinutes = 10 * 60 * 1000;
    this.intervalRef = setInterval(() => {
      this.pingServer(pingUrl);
    }, tenMinutes);
  }

  private pingServer(url: string) {
    try {
      const client = url.startsWith('https') ? https : http;
      client.get(url, (res) => {
        this.logger.log(`🔔 Keep-alive heartbeat successfully sent to ${url}. Status: ${res.statusCode}`);
      }).on('error', (err) => {
        this.logger.warn(`⚠️ Keep-alive heartbeat to ${url} failed: ${err.message}`);
      });
    } catch (err: any) {
      this.logger.warn(`⚠️ Keep-alive error: ${err.message}`);
    }
  }

  onModuleDestroy() {
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
      this.intervalRef = null;
    }
  }
}
