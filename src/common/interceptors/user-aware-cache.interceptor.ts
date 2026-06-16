import { Injectable, ExecutionContext } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { Request } from 'express';

/**
 * Custom Cache Interceptor kế thừa từ CacheInterceptor của NestJS.
 *
 * Mục đích:
 * 1. KHÔNG cache các endpoint dữ liệu cá nhân (notifications, enrollments, orders, refunds...)
 *    vì global CacheInterceptor dùng URL làm key → cross-account data leak nếu cache chung.
 * 2. Với các endpoint public (courses, categories...), cache bình thường.
 *
 * Các route bị EXCLUDE khỏi cache:
 *  - /notifications/*   → dữ liệu cá nhân real-time
 *  - /enrollments/*     → tiến độ học tập cá nhân
 *  - /orders/*          → lịch sử đơn hàng cá nhân
 *  - /refunds/*         → hoàn tiền cá nhân
 *  - /wallets/*         → ví tiền cá nhân
 *  - /users/*           → hồ sơ cá nhân
 *  - /carts/*           → giỏ hàng cá nhân
 *  - /lesson-progress/* → tiến độ bài học cá nhân
 *  - /wishlist/*        → danh sách yêu thích cá nhân
 *  - /statistics/*      → thống kê động
 *  - Tất cả non-GET requests
 */
const PERSONAL_ROUTE_PREFIXES = [
  '/api/v1/notifications',
  '/api/v1/enrollments',
  '/api/v1/orders',
  '/api/v1/refunds',
  '/api/v1/wallets',
  '/api/v1/users',
  '/api/v1/carts',
  '/api/v1/lesson-progress',
  '/api/v1/wishlist',
  '/api/v1/statistics',
];

@Injectable()
export class UserAwareCacheInterceptor extends CacheInterceptor {
  /**
   * trackBy: Trả về cache key hoặc undefined (undefined = skip cache).
   *
   * Nếu trả về undefined → không cache request này.
   * Nếu trả về string → dùng string đó làm cache key.
   */
  trackBy(context: ExecutionContext): string | undefined {
    const request = context.switchToHttp().getRequest<Request>();

    // Chỉ cache GET requests
    if (request.method !== 'GET') {
      return undefined;
    }

    const path = request.path;

    // Không cache các route dữ liệu cá nhân
    const isPersonalRoute = PERSONAL_ROUTE_PREFIXES.some((prefix) =>
      path.startsWith(prefix),
    );

    if (isPersonalRoute) {
      return undefined;
    }

    // Các route public: dùng URL làm cache key (hành vi mặc định)
    return request.url;
  }
}
