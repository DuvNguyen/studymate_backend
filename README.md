# StudyMate - Backend API

StudyMate là hệ thống quản lý học tập (LMS) hiện đại, hỗ trợ đa vai trò người dùng và quy trình làm việc chuyên nghiệp giữa Học viên, Giảng viên và Quản trị viên. Đây là kho lưu trữ mã nguồn cho phần Backend của hệ thống.

## 🚀 Công nghệ sử dụng

Hệ thống được xây dựng trên nền tảng NestJS với kiến trúc mạnh mẽ và có khả năng mở rộng:

- **Framework**: [NestJS 11+](https://nestjs.com/) (Node.js)
- **Database**: [PostgreSQL](https://www.postgresql.org/) (Sử dụng [Neon DB](https://neon.tech/))
- **ORM**: [TypeORM](https://typeorm.io/)
- **Authentication**: [Clerk Auth](https://clerk.com/) (JWT & Social Login)
- **Media Storage**: [Cloudinary](https://cloudinary.com/)
- **Webhook Integration**: [Svix](https://www.svix.com/) (Xác thực chữ ký Clerk Webhook)
- **Security**: Helmet, Throttler, CORS, ValidationPipe
- **Video Hosting**: YouTube Data API v3 (Centralized Channel)

## 🏗️ Kiến trúc Hệ thống

Backend tuân thủ nghiêm ngặt mô hình Layered Architecture:

```text
Request (JWT) -> Guard (Roles) -> Controller -> Service -> Repository -> Database
```

- **ClerkAuthGuard**: Xác thực token JWT từ Clerk và gán thông tin người dùng vào request.
- **Service Pattern**: Chứa 100% logic nghiệp vụ. Không query trực tiếp trong controller.
- **Repository Pattern**: Quản lý các thao tác với cơ sở dữ liệu và khai báo các quan hệ (relations).
- **DTO (Data Transfer Objects)**: Sử dụng `class-validator` để kiểm soát dữ liệu input/output.

## 📂 Các Module Chính

- `auth`: Xử lý xác thực và đồng bộ người dùng từ Clerk qua Webhooks.
- `users`: Quản lý thông tin cá nhân, hồ sơ Giảng viên (KYC), và Staff.
- `categories`: Hệ thống danh mục khóa học phân cấp đa tầng.
- `courses`: Quản lý khóa học, lộ trình học tập và phê duyệt.
- `lessons`: Bài học, nội dung chi tiết và media.
- `quizzes`: Hệ thống bài kiểm tra và đánh giá học viên.
- `orders & enrollments`: Quy trình thanh toán, tạo đơn hàng và ghi danh khóa học.
- `wallets`: Quản lý số dư và doanh thu cho Giảng viên.
- `uploads`: Module dùng chung để xử lý file lên Cloudinary.

## 🛠️ Cài đặt và Chạy Project

### 1. Yêu cầu hệ thống
- Node.js 20+
- PostgreSQL (hoặc Neon DB URL)

### 2. Cấu hình môi trường
Tạo file `.env` từ `.env.example` và điền đầy đủ các thông tin:

```bash
cp .env.example .env
```

Cần chú ý các khóa quan trọng từ Clerk, Cloudinary và Neon DB.

### 3. Cài đặt dependency
```bash
npm install
```

### 4. Chạy ứng dụng
```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

### 5. Database Seed (Dữ liệu mẫu)
```bash
npm run seed
```

## 🔐 Workflow Quan trọng

1. **KYC Giảng viên**: Giảng viên nộp hồ sơ (`InstructorDocument`) -> Staff duyệt -> Tài khoản được kích hoạt quyền tạo khóa học.
2. **Phê duyệt Khóa học**: Course được tạo -> Gửi yêu cầu phê duyệt -> Staff kiểm tra nội dung -> Public khóa học.
3. **Đồng bộ User**: Khi người dùng đăng ký trên UI (Clerk) -> Clerk gửi webhook -> Backend nhận và tạo bản ghi tương ứng trong bảng `users` tại database local.

---

## 📄 License
Project này được phát triển nội bộ cho StudyMate. Mọi hình thức sao chép cần được sự đồng ý của tác giả.
