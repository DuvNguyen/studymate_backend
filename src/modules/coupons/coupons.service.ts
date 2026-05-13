import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Coupon, DiscountType } from '../../database/entities/coupon.entity';
import { User } from '../../database/entities/user.entity';

const MONTHLY_COUPON_LIMIT = 3;

@Injectable()
export class CouponsService {
  constructor(
    @InjectRepository(Coupon)
    private couponsRepo: Repository<Coupon>,
  ) {}

  async create(data: Partial<Coupon>, instructor: User) {
    // ── Unique code check ──────────────────────────────────────
    const existing = await this.couponsRepo.findOne({
      where: { code: data.code },
    });
    if (existing) {
      throw new BadRequestException('Mã giảm giá này đã tồn tại trong hệ thống. Vui lòng chọn tên khác.');
    }
    // ────────────────────────────────────────────────────────────

    // ── Monthly limit check ──────────────────────────────────────
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);

    const countThisMonth = await this.couponsRepo.count({
      where: {
        instructorId: instructor.id,
        createdAt: Between(startOfMonth, startOfNextMonth),
      },
    });

    if (countThisMonth >= MONTHLY_COUPON_LIMIT) {
      throw new BadRequestException(
        `Bạn đã tạo ${countThisMonth}/${MONTHLY_COUPON_LIMIT} mã giảm giá trong tháng này. Giới hạn sẽ được reset vào đầu tháng sau.`,
      );
    }
    // ────────────────────────────────────────────────────────────

    const coupon = this.couponsRepo.create({
      ...data,
      instructorId: instructor.id,
    });
    return this.couponsRepo.save(coupon);
  }

  async findAllByInstructor(instructorId: number) {
    return this.couponsRepo.find({
      where: { instructorId },
      order: { createdAt: 'DESC' },
    });
  }

  async validateCoupon(code: string, subtotal: number) {
    const coupon = await this.couponsRepo.findOne({
      where: { code, isActive: true },
    });

    if (!coupon) {
      throw new NotFoundException('Mã giảm giá không tồn tại hoặc đã hết hạn');
    }

    const now = new Date();
    if (coupon.startDate && coupon.startDate > now) {
      throw new BadRequestException('Mã giảm giá chưa đến ngày sử dụng');
    }
    if (coupon.endDate && coupon.endDate < now) {
      throw new BadRequestException('Mã giảm giá đã hết hạn');
    }
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Mã giảm giá đã hết lượt sử dụng');
    }
    if (subtotal < Number(coupon.minOrderValue)) {
      throw new BadRequestException(`Đơn hàng tối thiểu phải từ ₫${Number(coupon.minOrderValue).toLocaleString('vi-VN')} để sử dụng mã này`);
    }

    let discountAmount = 0;
    if (coupon.discountType === DiscountType.PERCENTAGE) {
      discountAmount = (subtotal * Number(coupon.discountValue)) / 100;
      if (coupon.maxDiscountAmount && discountAmount > Number(coupon.maxDiscountAmount)) {
        discountAmount = Number(coupon.maxDiscountAmount);
      }
    } else {
      discountAmount = Number(coupon.discountValue);
    }

    return {
      coupon,
      discountAmount,
    };
  }

  async incrementUsedCount(id: number) {
    await this.couponsRepo.increment({ id }, 'usedCount', 1);
  }
}
