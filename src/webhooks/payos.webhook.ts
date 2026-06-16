import { Body, Controller, Post } from '@nestjs/common';
import type { Webhook } from '@payos/node';
import { OrdersService } from '../modules/orders/orders.service';
import { PayosService } from '../modules/payments/payos.service';

@Controller('webhooks/payos')
export class PayosWebhookController {
  constructor(
    private readonly payosService: PayosService,
    private readonly ordersService: OrdersService,
  ) {}

  @Post()
  async handlePayosWebhook(@Body() webhook: Webhook) {
    const webhookData = await this.payosService.verifyWebhook(webhook);

    if (!webhook.success || webhookData.code !== '00') {
      return { received: true, ignored: true };
    }

    const result = await this.ordersService.processPayosWebhook(webhookData);

    return { received: true, ...result };
  }
}
