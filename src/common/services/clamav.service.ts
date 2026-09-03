import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'clamav.js';

@Injectable()
export class ClamavService implements OnModuleInit {
  private readonly logger = new Logger(ClamavService.name);
  private client: ReturnType<typeof createClient> | null = null;
  private enabled = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const host = this.configService.get<string>('CLAMAV_HOST') || 'localhost';
    const port = this.configService.get<number>('CLAMAV_PORT') || 3310;
    const enabled = this.configService.get<string>('CLAMAV_ENABLED') === 'true';

    if (!enabled) {
      this.logger.warn('ClamAV scanning disabled (CLAMAV_ENABLED !== true)');
      return;
    }

    try {
      this.client = createClient(port, host);
      await this.ping();
      this.enabled = true;
      this.logger.log(`ClamAV connected to ${host}:${port}`);
    } catch (error) {
      this.logger.error(
        `Failed to connect to ClamAV at ${host}:${port}: ${(error as Error).message}`,
      );
      this.logger.warn('File uploads will proceed WITHOUT virus scanning');
    }
  }

  private async ping(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client) return reject(new Error('Client not initialized'));
      this.client.ping((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async scanFile(
    filePath: string,
  ): Promise<{ clean: boolean; threat?: string }> {
    if (!this.enabled || !this.client) {
      return { clean: true };
    }

    return new Promise((resolve) => {
      this.client!.scanFile(filePath, (err, object, virus) => {
        if (err) {
          this.logger.error(`ClamAV scan error: ${err.message}`);
          resolve({ clean: false, threat: `Scan error: ${err.message}` });
          return;
        }
        if (virus) {
          this.logger.warn(`ClamAV detected threat: ${virus} in ${filePath}`);
          resolve({ clean: false, threat: virus });
          return;
        }
        resolve({ clean: true });
      });
    });
  }

  async scanBuffer(
    buffer: Buffer,
  ): Promise<{ clean: boolean; threat?: string }> {
    if (!this.enabled || !this.client) {
      return { clean: true };
    }

    return new Promise((resolve) => {
      this.client!.scanBuffer(buffer, (err, object, virus) => {
        if (err) {
          this.logger.error(`ClamAV buffer scan error: ${err.message}`);
          resolve({ clean: false, threat: `Scan error: ${err.message}` });
          return;
        }
        if (virus) {
          this.logger.warn(`ClamAV detected threat in buffer: ${virus}`);
          resolve({ clean: false, threat: virus });
          return;
        }
        resolve({ clean: true });
      });
    });
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
