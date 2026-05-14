import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Coupon } from '../../database/entities/coupon.entity';
import { User } from '../../database/entities/user.entity';

@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get('validate')
  async validate(
    @Query('code') code: string,
    @Query('subtotal') subtotal: string,
  ) {
    return this.couponsService.validateCoupon(code, Number(subtotal));
  }

  @Post()
  @UseGuards(ClerkAuthGuard, RolesGuard)
  @Roles('INSTRUCTOR')
  async create(@Body() data: Partial<Coupon>, @CurrentUser() user: User) {
    return this.couponsService.create(data, user);
  }

  @Get('me')
  @UseGuards(ClerkAuthGuard, RolesGuard)
  @Roles('INSTRUCTOR')
  async getMyCoupons(@CurrentUser('id') userId: number) {
    return this.couponsService.findAllByInstructor(userId);
  }
}
