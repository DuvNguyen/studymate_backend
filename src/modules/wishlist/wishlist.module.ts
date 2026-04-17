import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';
import { Wishlist } from '../../database/entities/wishlist.entity';
import { Course } from '../../database/entities/course.entity';
import { User } from '../../database/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Wishlist, Course, User])],
  controllers: [WishlistController],
  providers: [WishlistService],
  exports: [WishlistService],
})
export class WishlistModule {}
