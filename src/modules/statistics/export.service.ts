import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../../database/entities/order.entity';
import * as ExcelJS from 'exceljs';
import * as express from 'express';

@Injectable()
export class ExportService {
  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>
  ) {}

  async exportRevenueToExcel(res: express.Response) {
    const orders = await this.orderRepo.find({
      where: { status: OrderStatus.COMPLETED },
      relations: ['student'],
      order: { created_at: 'DESC' }
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Báo cáo Doanh thu');

    sheet.columns = [
      { header: 'Mã Đơn Hàng', key: 'order_number', width: 20 },
      { header: 'Ngày', key: 'created_at', width: 20 },
      { header: 'Học Viên', key: 'student', width: 30 },
      { header: 'Tạm Tính ($)', key: 'subtotal', width: 15 },
      { header: 'Giảm Giá ($)', key: 'discount', width: 15 },
      { header: 'Thành Tiền ($)', key: 'total', width: 15 },
    ];

    orders.forEach(order => {
      sheet.addRow({
        order_number: order.order_number,
        created_at: order.created_at.toISOString(),
        student: order.student?.email || 'N/A',
        subtotal: order.subtotal,
        discount: order.discount_amount,
        total: order.total_amount
      });
    });

    // Styling
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD600' } };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=bao_cao_doanh_thu.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  }
}
