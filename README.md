# StudyMate Backend

Backend API cho hệ thống StudyMate LMS, xây dựng bằng NestJS, cung cấp nghiệp vụ cho học viên, giảng viên, staff và admin.

## Tổng quan kỹ thuật

- Framework: NestJS `11`
- Runtime: Node.js
- ORM: TypeORM `0.3`
- Database: PostgreSQL (hỗ trợ Neon)
- Cache: Redis qua `cache-manager-redis-yet`
- Auth: Clerk (`@clerk/backend`)
- Search: Meilisearch
- Storage: Cloudinary
- API docs: Swagger tại `/docs`
- API prefix: `/api/v1`

## Kiến trúc và xử lý request

Luồng chính:

`Request -> Guard -> Controller -> Service -> TypeORM -> PostgreSQL`

Cấu hình toàn cục hiện tại:

- `ValidationPipe` với `whitelist`, `transform`, `forbidNonWhitelisted`
- `helmet` cho HTTP security headers
- `ThrottlerGuard` global (`100` requests / `60s`)
- `CacheInterceptor` global
- `TransformInterceptor` global
- `HttpExceptionFilter` global
- CORS theo `FRONTEND_URL` (danh sách phân tách dấu phẩy) + localhost + domain deploy

## Module nghiệp vụ

Các module đang có trong `src/modules`:

- `auth`
- `users`
- `categories`
- `courses`
- `sections`
- `lessons`
- `videos`
- `quizzes`
- `lesson-progress`
- `discussions`
- `reviews`
- `search`
- `carts`
- `orders`
- `enrollments`
- `wishlist`
- `coupons`
- `wallets`
- `refunds`
- `statistics`
- `notifications`
- `uploads`
- `health`

## Luồng nghiệp vụ tiêu biểu (GitNexus)

- Course discovery và học tập: `FindAll`, `FindOne`, `FindOneForLearn`
- Vòng đời khóa học giảng viên/admin: tạo, submit review, approve/reject/suspend, archive
- Thanh toán và hậu thanh toán: `Checkout`, `SimulatePayment`, enrollments
- Quiz lifecycle: `StartQuiz`, `SubmitQuiz`, tracking attempt
- Ví và payout: `RequestPayout`, `ProcessPayout`, đối soát ledger
- Tìm kiếm: đồng bộ index course/user sang Meilisearch

## API chính (nhóm endpoint)

- Auth và onboarding: `/auth/*`, webhook Clerk tại `/clerk`
- Course domain: `/courses/*`, `/instructor/courses/*`, `/admin/courses/*`
- User/KYC/admin user: `/users/*`
- Enrollments và purchases: `/enrollments/*`
- Quizzes/question bank: `/quizzes/*`, `/instructor/question-banks/*`
- Wallet/payout/ledger: `/wallets/*`
- Refunds: `/refunds/*`
- Reviews, discussions, notifications, search, categories, carts, wishlist

## Biến môi trường

Tạo file `.env` trong root backend. Các key đang được sử dụng:

- `NODE_ENV`
- `PORT`
- `FRONTEND_URL`
- `PUBLIC_FRONTEND_URL` (tùy chọn, dùng cho PayOS return/cancel URL; production nên là `https://studymatelms.vercel.app`)
- `DATABASE_URL`
- `REDIS_URL` hoặc `REDIS_HOST`, `REDIS_PORT`, `REDIS_TTL`
- `CLERK_SECRET_KEY`
- `CLERK_PUBLISHABLE_KEY`
- `CLERK_JWT_KEY`
- `CLERK_WEBHOOK_SECRET`
- `PAYOS_CLIENT_ID`
- `PAYOS_API_KEY`
- `PAYOS_CHECKSUM_KEY`
- `PAYOS_PARTNER_CODE` (tùy chọn)
- `PAYOS_BASE_URL` (tùy chọn, mặc định SDK dùng PayOS production)
- `CLOUDINARY_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `MEILISEARCH_HOST`
- `MEILISEARCH_API_KEY`
- `YOUTUBE_CLIENT_ID`
- `YOUTUBE_CLIENT_SECRET`
- `YOUTUBE_REFRESH_TOKEN`

## PayOS webhook

Endpoint nhận webhook thanh toán khóa học là `POST /webhooks/payos`. URL production hiện tại nên đăng ký là `https://studymate-backend-hxc9.onrender.com/api/v1/webhooks/payos`. Khi deploy staging/production, đăng ký URL public dạng `https://<backend-domain>/api/v1/webhooks/payos` trong PayOS. Backend chỉ hoàn tất đơn hàng khi webhook PayOS verify chữ ký thành công, `orderCode` khớp order id, `paymentLinkId` khớp đơn, và số tiền thanh toán khớp `total_amount`.

## Cài đặt và chạy

```bash
npm install
npm run start:dev
```

Mặc định backend chạy ở `http://localhost:3001/api/v1`.

Swagger:

- `http://localhost:3001/docs`

Build production:

```bash
npm run build
npm run start:prod
```

## Scripts

- `npm run start`
- `npm run start:dev`
- `npm run start:debug`
- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run test:watch`
- `npm run test:cov`
- `npm run test:e2e`
- `npm run seed`
- `npm run sync:meili`

## Seed và search sync

```bash
npm run seed
npm run sync:meili
```

## Ghi chú vận hành

- `TypeORM synchronize` chỉ bật khi kết nối DB local (`localhost`/`127.0.0.1`).
- `CourseStatsSubscriber` được gắn vào TypeORM subscribers để cập nhật dữ liệu denormalized liên quan course.
- Endpoint analytics bổ sung có service Python tại `python-analytics/main.py`.
