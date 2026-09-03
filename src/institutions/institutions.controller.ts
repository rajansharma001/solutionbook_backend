import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { InstitutionsService } from './institutions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

interface RequestWithUser {
  user: { sub: string };
}

@Controller('institutions')
@UseGuards(JwtAuthGuard)
export class InstitutionsController {
  constructor(private readonly institutionsService: InstitutionsService) {}

  // System Admin

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  getAllInstitutions() {
    return this.institutionsService.getAllInstitutions();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  createInstitution(
    @Body() body: { name: string; contactName: string; email: string },
  ) {
    return this.institutionsService.createInstitution(body);
  }

  @Post(':id/licenses')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  allocateLicenses(
    @Param('id') id: string,
    @Body() body: { courseId: string; totalSeats: number },
  ) {
    return this.institutionsService.allocateLicenses(id, body);
  }

  @Post(':id/admins')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  addInstitutionAdmin(
    @Param('id') id: string,
    @Body() body: { userId: string },
  ) {
    return this.institutionsService.addInstitutionAdmin(id, body.userId);
  }

  // Institution Admin

  @Get('my')
  getMyInstitution(@Request() req: RequestWithUser) {
    return this.institutionsService.getMyInstitution(req.user.sub);
  }

  @Post('my/invite')
  inviteStudent(
    @Request() req: RequestWithUser,
    @Body() body: { email: string; courseId: string },
  ) {
    return this.institutionsService.inviteStudent(
      req.user.sub,
      body.email,
      body.courseId,
    );
  }
}
