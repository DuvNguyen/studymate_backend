import { Controller, Get, Header, SetMetadata, HttpStatus, Res } from '@nestjs/common';
import * as Express from 'express';
import { DataSource } from 'typeorm';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * GET /api/v1/health
   * Public — Kiểm tra sức khỏe của hệ thống và kết nối database.
   * Sử dụng @Res() để bypass qua TransformInterceptor và HttpExceptionFilter toàn cục,
   * trả về JSON trực tiếp và đầy đủ chi tiết kể cả khi gặp lỗi.
   */
  @Get()
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @SetMetadata('cache-manager:nocache', true)
  @ApiOperation({ summary: 'Kiểm tra trạng thái hệ thống, kết nối database và kết nối internet ngoại vi' })
  @ApiResponse({ status: 200, description: 'Hệ thống hoạt động bình thường' })
  @ApiResponse({ status: 503, description: 'Hệ thống hoặc database gặp sự cố' })
  async checkHealth(@Res() res: Express.Response): Promise<void> {
    const status: {
      status: 'UP' | 'DOWN';
      timestamp: string;
      database: 'UP' | 'DOWN';
      databaseLatencyMs?: number;
      internet?: 'UP' | 'DOWN' | 'SKIPPED';
      internetLatencyMs?: number;
      error?: string;
    } = {
      status: 'UP',
      timestamp: new Date().toISOString(),
      database: 'UP',
    };

    // 1. Kiểm tra Database connection
    const dbStartTime = Date.now();
    try {
      // Thực hiện query SELECT 1 với timeout thủ công là 2 giây
      await Promise.race([
        this.dataSource.query('SELECT 1'),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Database query timeout (2000ms)')), 2000)
        ),
      ]);
      status.databaseLatencyMs = Date.now() - dbStartTime;
    } catch (dbError: any) {
      status.status = 'DOWN';
      status.database = 'DOWN';
      status.error = `Database connection error: ${dbError.message || dbError}`;
    }

    // 2. Kiểm tra Mạng Internet (chỉ chạy ở môi trường Development để tránh phí băng thông)
    if (process.env.NODE_ENV === 'development') {
      const internetStartTime = Date.now();
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 2000);

      try {
        const response = await fetch('https://1.1.1.1', {
          signal: controller.signal,
          method: 'HEAD',
        });
        status.internet = response.ok ? 'UP' : 'DOWN';
        status.internetLatencyMs = Date.now() - internetStartTime;
        if (!response.ok) {
          status.status = 'DOWN';
          status.error = status.error
            ? `${status.error} | Internet returned status: ${response.status}`
            : `Internet probe status: ${response.status}`;
        }
      } catch (netError: any) {
        status.status = 'DOWN';
        status.internet = 'DOWN';
        status.error = status.error
          ? `${status.error} | Internet connection error: ${netError.message || netError}`
          : `Internet connection error: ${netError.message || netError}`;
      } finally {
        clearTimeout(id);
      }
    } else {
      status.internet = 'SKIPPED';
    }

    // Trả về mã HTTP tương ứng
    if (status.status === 'DOWN') {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json(status);
    } else {
      res.status(HttpStatus.OK).json(status);
    }
  }
}
