import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { ExportService } from './export.service';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import * as express from 'express';

@Controller('statistics')
@UseGuards(ClerkAuthGuard, RolesGuard)
@Roles('ADMIN', 'STAFF')
export class StatisticsController {
  constructor(
    private readonly statisticsService: StatisticsService,
    private readonly exportService: ExportService,
  ) {}

  @Get('export/excel')
  async exportExcel(@Res() res: express.Response) {
    return this.exportService.exportRevenueToExcel(res);
  }

  @Get('dashboard')
  async getDashboard(
    @Query('startDate') startDate?: string, 
    @Query('endDate') endDate?: string
  ) {
    const data = await this.statisticsService.getDashboardStats(startDate, endDate);
    return { success: true, data };
  }

  @Get('revenue-chart')
  async getRevenueChart(
    @Query('startDate') startDate?: string, 
    @Query('endDate') endDate?: string,
    @Query('days') days?: string
  ) {
    const data = await this.statisticsService.getRevenueChart(startDate, endDate, days ? parseInt(days) : undefined);
    return { success: true, data };
  }

  @Get('categories')
  async getCategories(
    @Query('startDate') startDate?: string, 
    @Query('endDate') endDate?: string
  ) {
    const data = await this.statisticsService.getCategoryDistribution(startDate, endDate);
    return { success: true, data };
  }

  @Get('analytics')
  async getAnalytics(
    @Query('startDate') startDate?: string, 
    @Query('endDate') endDate?: string
  ) {
    const data = await this.statisticsService.getAnalyticsSummary(startDate, endDate);
    return { success: true, data };
  }
}
