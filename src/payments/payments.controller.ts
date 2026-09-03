import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

interface RequestWithUser {
  user: { sub: string };
}

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  getUserPayments(
    @Request() req: RequestWithUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.paymentsService.getUserPayments(req.user.sub, page, limit);
  }

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  getAllPayments(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) {
    return this.paymentsService.getAllPayments(status, page, limit);
  }

  @Get(':id')
  getPayment(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.paymentsService.getPaymentById(id, req.user.sub);
  }

  @Post()
  createPayment(
    @Request() req: RequestWithUser,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.createPayment(req.user.sub, dto);
  }

  @Patch(':id/verify')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  verifyPayment(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.paymentsService.verifyPayment(req.user.sub, id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  deletePayment(@Param('id') id: string) {
    return this.paymentsService.deletePayment(id);
  }
}
