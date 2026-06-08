import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './common/adapters/redis-io.adapter';

async function bootstrap() {
  console.log('Đang khởi động lại Backend để nạp cấu hình mới...');
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // cần cho Clerk webhook signature verification
  });

  const config = app.get(ConfigService);

  const redisIoAdapter = new RedisIoAdapter(app, config);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  // Bảo mật HTTP headers
  app.use(helmet());

  // CORS — cho phép frontend gọi API
  const normalizeOrigin = (value: string) => value.trim().replace(/\/+$/, '');
  const frontendUrls = (config.get<string>('FRONTEND_URL') || '')
    .split(',')
    .map((url) => normalizeOrigin(url))
    .filter(Boolean);
  app.enableCors({
    origin: [
      ...frontendUrls,
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      'https://studymatelms.vercel.app',
    ],
    credentials: true,
  });

  // Prefix for all APIs
  app.setGlobalPrefix('api/v1');

  // Validation tự động cho DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // tự loại bỏ field không khai báo trong DTO
      transform: true, // tự convert kiểu dữ liệu
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('StudyMate API')
    .setDescription('StudyMate backend API documentation')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'bearer',
    )
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  // Kích hoạt shutdown hooks để đóng các kết nối DB một cách an toàn khi restart/shutdown
  app.enableShutdownHooks();

  const port = config.get<number>('PORT') || 3001;
  await app.listen(port);

  console.log(` Backend đang chạy tại http://localhost:${port}/api/v1`);
  console.log(` Swagger docs: http://localhost:${port}/docs`);
}

void bootstrap();
