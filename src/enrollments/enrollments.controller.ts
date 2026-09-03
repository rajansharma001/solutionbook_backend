import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { CreateEnrollmentDto } from './dto/enrollment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @Post()
  enroll(
    @Request() req: { user: { sub: string } },
    @Body() createEnrollmentDto: CreateEnrollmentDto,
  ) {
    return this.enrollmentsService.enroll(req.user.sub, createEnrollmentDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @Get('my-enrollments')
  getMyEnrollments(@Request() req: { user: { sub: string } }) {
    return this.enrollmentsService.getMyEnrollments(req.user.sub);
  }
}
