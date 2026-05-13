import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';
import { AnalyticsBridgeService } from './analytics-bridge.service';
import { ExportService } from './export.service';
import { Order } from '../../database/entities/order.entity';
import { OrderItem } from '../../database/entities/order-item.entity';
import { Course } from '../../database/entities/course.entity';
import { Category } from '../../database/entities/category.entity';
import { User } from '../../database/entities/user.entity';
import { Transaction } from '../../database/entities/transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order, 
      OrderItem, 
      Course, 
      Category, 
      User, 
      Transaction
    ]),
  ],
  controllers: [StatisticsController],
  providers: [StatisticsService, AnalyticsBridgeService, ExportService],
  exports: [StatisticsService],
})
export class StatisticsModule {}
