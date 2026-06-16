import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PayOS,
  type CreatePaymentLinkResponse,
  type Webhook,
  type WebhookData,
} from '@payos/node';
import { Order } from '../../database/entities/order.entity';

@Injectable()
export class PayosService {
  private client?: PayOS;

  constructor(private readonly config: ConfigService) {}

  async createCoursePaymentLink(
    order: Order,
  ): Promise<CreatePaymentLinkResponse> {
    const amount = Math.round(Number(order.total_amount));
    const frontendUrl = this.getFrontendUrl();
    const pendingUrl = `${frontendUrl}/checkout/pending?orderId=${order.id}`;

    return this.getClient().paymentRequests.create({
      orderCode: order.id,
      amount,
      description: `SM${order.id}`,
      items: [
        {
          name: `StudyMate order ${order.id}`,
          quantity: 1,
          price: amount,
        },
      ],
      returnUrl: pendingUrl,
      cancelUrl: `${pendingUrl}&cancelled=1`,
    });
  }

  async verifyWebhook(webhook: Webhook): Promise<WebhookData> {
    try {
      return await this.getClient().webhooks.verify(webhook);
    } catch {
      throw new BadRequestException('Webhook payOS không hợp lệ');
    }
  }

  private getClient(): PayOS {
    if (this.client) {
      return this.client;
    }

    const clientId = this.config.get<string>('PAYOS_CLIENT_ID');
    const apiKey = this.config.get<string>('PAYOS_API_KEY');
    const checksumKey = this.config.get<string>('PAYOS_CHECKSUM_KEY');

    if (!clientId || !apiKey || !checksumKey) {
      throw new InternalServerErrorException(
        'Thiếu cấu hình PAYOS_CLIENT_ID, PAYOS_API_KEY hoặc PAYOS_CHECKSUM_KEY',
      );
    }

    this.client = new PayOS({
      clientId,
      apiKey,
      checksumKey,
      partnerCode: this.config.get<string>('PAYOS_PARTNER_CODE'),
      baseURL: this.config.get<string>('PAYOS_BASE_URL'),
    });

    return this.client;
  }

  private getFrontendUrl(): string {
    const configuredUrl = (
      this.config.get<string>('PUBLIC_FRONTEND_URL') ||
      this.config.get<string>('FRONTEND_URL') ||
      ''
    )
      .split(',')
      .map((url) => url.trim().replace(/\/+$/, ''))
      .find(Boolean);

    if (configuredUrl) {
      return configuredUrl;
    }

    return this.config.get<string>('NODE_ENV') === 'production'
      ? 'https://studymatelms.vercel.app'
      : 'http://localhost:3000';
  }
}
