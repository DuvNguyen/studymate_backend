import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Order, OrderStatus } from '../../database/entities/order.entity';
import { OrderItem } from '../../database/entities/order-item.entity';
import { Course } from '../../database/entities/course.entity';
import { Category } from '../../database/entities/category.entity';
import { Transaction } from '../../database/entities/transaction.entity';
import { AnalyticsBridgeService } from './analytics-bridge.service';
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private orderItemRepo: Repository<OrderItem>,
    @InjectRepository(Course) private courseRepo: Repository<Course>,
    @InjectRepository(Category) private categoryRepo: Repository<Category>,
    @InjectRepository(Transaction) private transactionRepo: Repository<Transaction>,
    private analyticsBridge: AnalyticsBridgeService,
  ) {}

  async getDashboardStats(startDate?: string, endDate?: string) {
    const { start, end } = this.getDateRange(startDate, endDate);

    const totalRevenueResult = await this.orderItemRepo
      .createQueryBuilder('item')
      .innerJoin('item.order', 'order')
      .select('SUM(item.platform_fee)', 'sum')
      .where('order.status = :status', { status: OrderStatus.COMPLETED })
      .andWhere('order.created_at BETWEEN :start AND :end', { start, end })
      .getRawOne();
      
    const totalRevenue = parseFloat(totalRevenueResult.sum || '0');
    const orderCount = await this.orderRepo.count({ 
      where: { 
        status: OrderStatus.COMPLETED,
        created_at: Between(start, end)
      } 
    });
    
    // MoM Growth (fixed for current month relative to last month)
    const thisMonthStart = startOfMonth(new Date());
    const lastMonthStart = startOfMonth(subMonths(new Date(), 1));
    const lastMonthEnd = endOfMonth(subMonths(new Date(), 1));

    const thisMonthRevResult = await this.orderItemRepo
      .createQueryBuilder('item')
      .innerJoin('item.order', 'order')
      .select('SUM(item.platform_fee)', 'sum')
      .where('order.status = :status', { status: OrderStatus.COMPLETED })
      .andWhere('order.created_at >= :start', { start: thisMonthStart })
      .getRawOne();
    
    const thisMonthRev = parseFloat(thisMonthRevResult.sum || '0');

    const lastMonthRevResult = await this.orderItemRepo
      .createQueryBuilder('item')
      .innerJoin('item.order', 'order')
      .select('SUM(item.platform_fee)', 'sum')
      .where('order.status = :status', { status: OrderStatus.COMPLETED })
      .andWhere('order.created_at BETWEEN :start AND :end', { start: lastMonthStart, end: lastMonthEnd })
      .getRawOne();
    
    const lastMonthRev = parseFloat(lastMonthRevResult.sum || '0');
    const growth = lastMonthRev === 0 ? 0 : ((thisMonthRev - lastMonthRev) / lastMonthRev) * 100;

    return {
      totalRevenue,
      orderCount,
      growth: Number(growth.toFixed(2)),
      thisMonthRevenue: thisMonthRev,
      period: { start, end }
    };
  }

  async getRevenueChart(startDate?: string, endDate?: string, days?: number) {
    const { start, end } = this.getDateRange(startDate, endDate, days || 30);
    const diffDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    
    // Optimized single query for the entire period - summing platform_fee
    const rawData = await this.orderItemRepo
      .createQueryBuilder('item')
      .innerJoin('item.order', 'order')
      .select("TO_CHAR(order.created_at, 'YYYY-MM-DD')", 'date')
      .addSelect('SUM(item.platform_fee)', 'sum')
      .where('order.status = :status', { status: OrderStatus.COMPLETED })
      .andWhere('order.created_at BETWEEN :start AND :end', { start, end })
      .groupBy("TO_CHAR(order.created_at, 'YYYY-MM-DD')")
      .orderBy("TO_CHAR(order.created_at, 'YYYY-MM-DD')", 'ASC')
      .getRawMany();

    // Map raw data for easy lookup - Ensure we use trimmed string keys
    const dataMap = new Map();
    rawData.forEach(row => {
      const ds = row.date ? String(row.date).trim() : null;
      if (ds) {
        dataMap.set(ds, parseFloat(row.sum));
      }
    });

    const result: { ds: string; y: number }[] = [];
    for (let i = diffDays - 1; i >= 0; i--) {
      const date = subDays(end, i);
      const ds = format(date, 'yyyy-MM-dd');
      const val = dataMap.get(ds);
      result.push({
        ds,
        y: val !== undefined ? val : 0
      });
    }
    return result;
  }

  async getCategoryDistribution(startDate?: string, endDate?: string) {
    const { start, end } = this.getDateRange(startDate, endDate);

    const rawData = await this.orderItemRepo
      .createQueryBuilder('item')
      .innerJoin('item.order', 'order')
      .innerJoin('item.course', 'course')
      .innerJoin('course.category', 'category')
      .select('category.id', 'id')
      .addSelect('category.name', 'name')
      .addSelect('SUM(item.platform_fee)', 'value')
      .where('order.status = :status', { status: OrderStatus.COMPLETED })
      .andWhere('order.created_at BETWEEN :start AND :end', { start, end })
      .groupBy('category.id')
      .addGroupBy('category.name')
      .getRawMany();

    return rawData.map(row => ({
      id: parseInt(row.id),
      name: row.name,
      value: parseFloat(row.value)
    }));
  }

  async getAnalyticsSummary(startDate?: string, endDate?: string) {
    const { start, end } = this.getDateRange(startDate, endDate);
    
    // Use the requested range for forecasting input
    const history = await this.getRevenueChart(
      format(subDays(start, 30), 'yyyy-MM-dd'), // Include some history before the start
      format(end, 'yyyy-MM-dd')
    );
    
    const forecast = await this.analyticsBridge.getRevenueForecast(history, 30);
    const anomalies = await this.analyticsBridge.detectAnomalies(history.slice(-90));
    
    const categories = await this.getCategoryDistribution(startDate, endDate);
    const rankingItems = categories.map(c => ({
      category_id: c.id,
      name: c.name,
      revenue_history: [c.value]
    }));
    const ranking = await this.analyticsBridge.getCategoryRanking(rankingItems);

    return {
      forecast,
      anomalies,
      ranking
    };
  }

  private getDateRange(startDate?: string, endDate?: string, defaultDays?: number) {
    let start: Date;
    let end: Date = endDate ? endOfDay(new Date(endDate)) : endOfDay(new Date());

    if (startDate) {
      start = startOfDay(new Date(startDate));
    } else if (defaultDays) {
      start = startOfDay(subDays(end, defaultDays - 1));
    } else {
      // Default to "toàn năm nay" (all of this year)
      start = startOfDay(new Date(new Date().getFullYear(), 0, 1));
    }
    return { start, end };
  }
}
