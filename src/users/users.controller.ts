import { Controller, Get, Patch, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  getProfile(@Request() req: { user: { sub: string } }) {
    return this.usersService.getProfile(req.user.sub);
  }

  @Patch('profile')
  updateProfile(
    @Request() req: { user: { sub: string } },
    @Body() body: any,
  ) {
    return this.usersService.updateProfile(req.user.sub, body);
  }

  @Delete('reviews/:id')
  deleteReview(
    @Request() req: { user: { sub: string } },
    @Param('id') reviewId: string,
  ) {
    return this.usersService.deleteOwnReview(req.user.sub, reviewId);
  }
}
