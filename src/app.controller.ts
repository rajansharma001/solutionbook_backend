import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { AdminService } from './admin/admin.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly adminService: AdminService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('settings')
  getSettings() {
    return this.adminService.getSettings();
  }
}
