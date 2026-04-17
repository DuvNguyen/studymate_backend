import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartsService } from './carts.service';
import { CartsController } from './carts.controller';
import { Cart } from '../../database/entities/cart.entity';
import { CartItem } from '../../database/entities/cart-item.entity';
import { Course } from '../../database/entities/course.entity';
import { Enrollment } from '../../database/entities/enrollment.entity';

import { User } from '../../database/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cart, CartItem, Course, Enrollment, User]),
  ],
  controllers: [CartsController],
  providers: [CartsService],
})
export class CartsModule {}
