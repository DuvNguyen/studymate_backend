import { INestApplicationContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { ServerOptions } from 'socket.io';

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor?: ReturnType<typeof createAdapter>;

  constructor(
    app: INestApplicationContext,
    private readonly config: ConfigService,
  ) {
    super(app);
  }

  async connectToRedis() {
    const redisUrl = this.config.get<string>('REDIS_URL');
    if (!redisUrl) {
      this.logger.log('REDIS_URL not set; Socket.IO is using in-memory adapter');
      return;
    }

    const pubClient = createClient({ url: redisUrl });
    const subClient = pubClient.duplicate();

    try {
      await Promise.all([pubClient.connect(), subClient.connect()]);
      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.logger.log('Socket.IO Redis adapter connected');
    } catch (error) {
      this.logger.error('Failed to connect Socket.IO Redis adapter', error as Error);
    }
  }

  createIOServer(port: number, options?: ServerOptions) {
    const normalizeOrigin = (value: string) => value.trim().replace(/\/+$/, '');
    const frontendUrls = (this.config.get<string>('FRONTEND_URL') || '')
      .split(',')
      .map((url) => normalizeOrigin(url))
      .filter(Boolean);
    const cors = {
      origin: [
        ...frontendUrls,
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://studymatelms.vercel.app',
      ],
      credentials: true,
    };

    const server = super.createIOServer(port, { ...options, cors });
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
