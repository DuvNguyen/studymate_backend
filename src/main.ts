import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // cần cho Clerk webhook signature verification
  });

  const config = app.get(ConfigService);

  // Bảo mật HTTP headers
  app.use(helmet());

  // CORS — cho phép frontend gọi API
  app.enableCors({
    origin: config.get('FRONTEND_URL') || 'http://localhost:3000',
    credentials: true,
  });

  // Prefix cho toàn bộ API
  app.setGlobalPrefix('api/v1');

  // Validation tự động cho DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,      // tự loại bỏ field không khai báo trong DTO
      transform: true,      // tự convert kiểu dữ liệu
      forbidNonWhitelisted: true,
    }),
  );

  const port = config.get<number>('PORT') || 3001;
  await app.listen(port);

  console.log(` Backend đang chạy tại http://localhost:${port}/api/v1`);
}

bootstrap();