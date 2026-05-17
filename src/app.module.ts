import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule, CacheInterceptor } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CoursesModule } from './modules/courses/courses.module';
import { VideosModule } from './modules/videos/videos.module';
import { SectionsModule } from './modules/sections/sections.module';
import { LessonsModule } from './modules/lessons/lessons.module';
import { CartsModule } from './modules/carts/carts.module';
import { OrdersModule } from './modules/orders/orders.module';
import { EnrollmentsModule } from './modules/enrollments/enrollments.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { DiscussionsModule } from './modules/discussions/discussions.module';
import { LessonProgressModule } from './modules/lesson-progress/lesson-progress.module';
import { WalletsModule } from './modules/wallets/wallets.module';
import { QuizzesModule } from './modules/quizzes/quizzes.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { RefundsModule } from './modules/refunds/refunds.module';
import { StatisticsModule } from './modules/statistics/statistics.module';
import { SearchModule } from './modules/search/search.module';
import { HealthModule } from './modules/health/health.module';
import { CourseStatsSubscriber } from './database/subscribers/course-stats.subscriber';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const dbUrl = config.get<string>('DATABASE_URL') || '';
        const host = dbUrl.split('@')[1]?.split('/')[0] || 'unknown';
        console.log(`[Database] Connecting to: ${host}`);

        const isLocal = host.includes('localhost') || host.includes('127.0.0.1');

        return {
          type: 'postgres',
          url: dbUrl,
          ssl: isLocal ? false : { rejectUnauthorized: false },
          autoLoadEntities: true,
          synchronize: isLocal, // Cho phép tự động tạo bảng ở local để tiện test
          logging: config.get('NODE_ENV') === 'development',
          extra: {
            max: 5,
            connectionTimeoutMillis: 20000,
            idleTimeoutMillis: 30000,
          },
          subscribers: [CourseStatsSubscriber],
        };
      },
    }),

    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        // Support Upstash REDIS_URL (rediss://...) or local REDIS_HOST/PORT
        const redisUrl =
          config.get<string>('REDIS_URL') ||
          `redis://${config.get<string>('REDIS_HOST', 'localhost')}:${config.get<string>('REDIS_PORT', '6379')}`;
        return {
          store: await redisStore({ url: redisUrl }),
          ttl: parseInt(config.get('REDIS_TTL', '3600'), 10) * 1000,
        };
      },
    }),

    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(),

    AuthModule,
    UsersModule,
    WebhooksModule,
    UploadsModule,
    CategoriesModule,
    CoursesModule,
    VideosModule,
    SectionsModule,
    LessonsModule,
    CartsModule,
    OrdersModule,
    EnrollmentsModule,
    WishlistModule,
    DiscussionsModule,
    LessonProgressModule,
    WalletsModule,
    QuizzesModule,
    CouponsModule,
    NotificationsModule,
    ReviewsModule,
    RefundsModule,
    StatisticsModule,
    SearchModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: CacheInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
