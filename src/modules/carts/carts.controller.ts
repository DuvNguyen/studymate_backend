import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CartsService } from './carts.service';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { User } from '../../database/entities/user.entity';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { CartResponseDto } from './dto/cart-response.dto';

@Controller('carts')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  @Get()
  getCart(@CurrentUser() user: User): Promise<CartResponseDto> {
    return this.cartsService.getCart(user);
  }

  @Post()
  addToCart(
    @CurrentUser() user: User,
    @Body() dto: AddToCartDto,
  ): Promise<CartResponseDto> {
    return this.cartsService.addToCart(user, dto);
  }

  @Delete(':itemId')
  removeFromCart(
    @CurrentUser() user: User,
    @Param('itemId') itemId: string,
  ): Promise<CartResponseDto> {
    return this.cartsService.removeFromCart(user, +itemId);
  }
}
