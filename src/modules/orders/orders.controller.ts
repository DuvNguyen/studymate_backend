import { Controller, Post, Get, Param, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';

@Controller('orders')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  checkout(@CurrentUser() user: User) {
    return this.ordersService.checkoutParams(user);
  }

  @Get(':id')
  getOrder(@Param('id') id: string) {
    return this.ordersService.findOne(+id);
  }

  // Temporary endpoint to bypass payment gateway for now
  @Post(':id/simulate-payment')
  simulatePayment(@Param('id') id: string) {
    return this.ordersService.testFulfillOrder(+id);
  }
}
