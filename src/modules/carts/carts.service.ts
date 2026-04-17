import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from '../../database/entities/cart.entity';
import { CartItem } from '../../database/entities/cart-item.entity';
import { Course } from '../../database/entities/course.entity';
import { Enrollment } from '../../database/entities/enrollment.entity';
import { CartResponseDto } from './dto/cart-response.dto';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { plainToInstance } from 'class-transformer';
import { CourseStatus } from '../../database/entities/course.entity';
import { User } from '../../database/entities/user.entity';

@Injectable()
export class CartsService {
  constructor(
    @InjectRepository(Cart) private cartsRepo: Repository<Cart>,
    @InjectRepository(CartItem) private cartItemsRepo: Repository<CartItem>,
    @InjectRepository(Course) private coursesRepo: Repository<Course>,
    @InjectRepository(Enrollment) private enrollmentsRepo: Repository<Enrollment>,
  ) {}

  async getCart(user: User): Promise<CartResponseDto> {
    console.log(`[CartsService] --> Fetching cart for user ID: ${user.id} (${user.clerkUserId})`);
    let cart = await this.cartsRepo.findOne({
      where: { student_id: user.id },
      relations: ['cart_items', 'cart_items.course'],
    });

    if (!cart) {
      console.log(`[CartsService] No cart found for user ${user.id}, creating new...`);
      cart = this.cartsRepo.create({ student_id: user.id });
      await this.cartsRepo.save(cart);
      cart.cart_items = [];
    }

    console.log(`[CartsService] Cart ID: ${cart.id}, Total Items: ${cart.cart_items?.length || 0}`);
    
    const dto = plainToInstance(CartResponseDto, cart, { excludeExtraneousValues: true });
    console.log(`[CartsService] <-- Returning DTO (items: ${dto.cart_items?.length || 0})`);
    
    return dto;
  }

  async addToCart(user: User, dto: AddToCartDto): Promise<CartResponseDto> {
    // 1. Get or Create Cart
    let cart = await this.cartsRepo.findOne({
      where: { student_id: user.id },
      relations: ['cart_items', 'cart_items.course']
    });

    if (!cart) {
      cart = this.cartsRepo.create({ student_id: user.id });
      await this.cartsRepo.save(cart);
      cart.cart_items = [];
    }

    // 2. Check Course validity
    const course = await this.coursesRepo.findOne({ where: { id: dto.courseId } });
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    if (course.status !== CourseStatus.PUBLISHED) {
      throw new BadRequestException('Cannot add non-published course to cart');
    }

    // 3. Check duplicate purchase
    const enrollment = await this.enrollmentsRepo.findOne({
      where: { student_id: user.id, course_id: course.id, is_active: true }
    });
    if (enrollment) {
      throw new BadRequestException('Bạn đã sở hữu khóa học này');
    }

    // 4. Check duplicate in cart
    const existingItem = cart.cart_items.find(item => item.course_id === course.id);
    if (existingItem) {
      throw new BadRequestException('Khóa học này đã có trong giỏ hàng');
    }

    // 5. Add item
    const newItem = this.cartItemsRepo.create({
      cart_id: cart.id,
      course_id: course.id,
      original_price: course.price,
      discount_amount: 0,
      final_price: course.price // Currently no coupons
    });

    await this.cartItemsRepo.save(newItem);
    
    // Refresh cart implicitly
    return this.getCart(user);
  }

  async removeFromCart(user: User, itemId: number): Promise<CartResponseDto> {
    const cart = await this.cartsRepo.findOne({ where: { student_id: user.id } });
    if (!cart) throw new NotFoundException('Cart not found');

    const item = await this.cartItemsRepo.findOne({ where: { id: itemId, cart_id: cart.id } });
    if (!item) throw new NotFoundException('Item not found in cart');

    await this.cartItemsRepo.remove(item);
    return this.getCart(user);
  }
}

