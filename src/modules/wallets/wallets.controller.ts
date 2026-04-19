import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  Patch,
  Res,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { Multer } from 'multer';
import { WalletsService } from './wallets.service';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';
import { RequestPayoutDto } from './dto/request-payout.dto';
import { ProcessPayoutDto } from './dto/process-payout.dto';
import { PayoutStatus } from '../../database/entities/payout.entity';

@Controller('wallets')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get('me')
  @Roles('INSTRUCTOR', 'STUDENT', 'STAFF', 'ADMIN')
  getWallet(@CurrentUser() user: User) {
    return this.walletsService.getMyWallet(user.id);
  }

  @Get('me/transactions')
  @Roles('INSTRUCTOR', 'STUDENT', 'STAFF', 'ADMIN')
  getTransactions(@CurrentUser() user: User) {
    return this.walletsService.getTransactionHistory(user.id);
  }

  @Get('me/payouts')
  @Roles('INSTRUCTOR')
  getMyPayouts(@CurrentUser() user: User) {
    return this.walletsService.getMyPayouts(user.id);
  }

  @Post('payout-request')
  @Roles('INSTRUCTOR')
  requestPayout(@CurrentUser() user: User, @Body() dto: RequestPayoutDto) {
    return this.walletsService.requestPayout(user.id, dto);
  }

  @Get('payouts')
  @Roles('ADMIN', 'STAFF')
  getAllPayouts(@Query('status') status?: PayoutStatus) {
    return this.walletsService.getPayoutRequests(status);
  }

  @Patch('payouts/:id/process')
  @Roles('ADMIN')
  processPayout(@Param('id') id: string, @Body() dto: ProcessPayoutDto) {
    return this.walletsService.processPayout(+id, dto);
  }

  @Post('payouts/export')
  @Roles('ADMIN', 'STAFF')
  async exportPayouts(@Body() body: { ids: number[] }, @Res() res: Response) {
    const buffer = await this.walletsService.exportPayouts(body.ids);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=studymate_payouts_${Date.now()}.xlsx`,
    );
    res.end(buffer);
  }

  @Post('payouts/reconcile')
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  async reconcilePayouts(@UploadedFile() file: Express.Multer.File) {
    const csvContent = file.buffer.toString('utf-8');
    return this.walletsService.reconcilePayouts(csvContent);
  }

  @Post('trigger-release')
  @Roles('ADMIN')
  triggerRelease() {
    return this.walletsService.releaseLockedTransactions();
  }

  @Get('ledger')
  @Roles('ADMIN', 'STAFF')
  getLedger(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.walletsService.getMasterLedger({
      status,
      type,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }
}
