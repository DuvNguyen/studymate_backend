import { Controller, Post, Get, Body, Param, UseGuards, Query } from '@nestjs/common';
import { RefundsService } from './refunds.service';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';
import { CreateRefundRequestDto } from './dto/create-refund-request.dto';
import { ProcessRefundDto } from './dto/process-refund.dto';
import { RefundStatus } from '../../database/entities/refund-request.entity';

@Controller('refunds')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Post('request')
  @Roles('STUDENT')
  createRequest(
    @CurrentUser() user: User,
    @Body() dto: CreateRefundRequestDto,
  ) {
    return this.refundsService.requestRefund(user.id, dto);
  }

  @Get('my')
  @Roles('STUDENT')
  getMyRefunds(@CurrentUser() user: User) {
    return this.refundsService.getMyRefunds(user.id);
  }

  @Get('admin/all')
  @Roles('ADMIN', 'STAFF')
  getAllRequests(@Query('status') status?: RefundStatus) {
    return this.refundsService.getRefundRequests(status);
  }

  @Post('admin/:id/process')
  @Roles('ADMIN', 'STAFF')
  processRequest(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: ProcessRefundDto,
  ) {
    return this.refundsService.processRefund(user.id, +id, dto);
  }
}
