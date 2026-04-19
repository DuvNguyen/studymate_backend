import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('api/v1/coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get('validate')
  async validate(@Query('code') code: string, @Query('subtotal') subtotal: string) {
    return this.couponsService.validateCoupon(code, Number(subtotal));
  }

  @Post()
  @UseGuards(ClerkAuthGuard, RolesGuard)
  @Roles('INSTRUCTOR')
  async create(@Body() data: any, @Request() req: any) {
    return this.couponsService.create(data, req.user);
  }

  @Get('me')
  @UseGuards(ClerkAuthGuard, RolesGuard)
  @Roles('INSTRUCTOR')
  async getMyCoupons(@Request() req: any) {
    return this.couponsService.findAllByInstructor(req.user.id);
  }
}
