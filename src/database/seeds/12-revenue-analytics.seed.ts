import { DataSource } from 'typeorm';
import { Order, OrderStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Course } from '../entities/course.entity';
import { User } from '../entities/user.entity';
import { subMonths, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

export class RevenueAnalyticsSeed {
  public async run(dataSource: DataSource): Promise<void> {
    const orderRepo = dataSource.getRepository(Order);
    const orderItemRepo = dataSource.getRepository(OrderItem);
    const courseRepo = dataSource.getRepository(Course);
    const userRepo = dataSource.getRepository(User);

    const courses = await courseRepo.find({ relations: ['instructor'] });
    const allUsers = await userRepo.find({ relations: ['role'] });
    const students = allUsers.filter(u => u.role?.roleName === 'STUDENT');

    if (courses.length === 0 || students.length === 0) {
      console.log('Skipping revenue seed: No courses or students found.');
      return;
    }

    console.log('Seeding 12 months of revenue data...');

    const startDate = subMonths(new Date(), 12);
    const endDate = new Date();

    const days = eachDayOfInterval({ start: startDate, end: endDate });

    for (const day of days) {
      // Determine number of orders for this day (with some randomness and growth trend)
      const dayIndex = days.indexOf(day);
      const totalDays = days.length;
      const progress = dayIndex / totalDays;
      
      let baseOrders = Math.floor(2 + (progress * 8)); // Growth from ~2 to ~10 orders/day
      
      // Inject intentional anomalies
      const isAnomaly = Math.random() > 0.95; // 5% chance of an anomaly day
      if (isAnomaly) {
        if (Math.random() > 0.5) {
          baseOrders *= 5; // Surge anomaly
          console.log(`[SEED] Surge anomaly on ${day.toISOString().split('T')[0]}`);
        } else {
          baseOrders = 0; // Drop anomaly
          console.log(`[SEED] Drop anomaly on ${day.toISOString().split('T')[0]}`);
        }
      }

      const orderCount = isAnomaly && baseOrders === 0 ? 0 : Math.floor(Math.random() * baseOrders) + 1;

      for (let i = 0; i < orderCount; i++) {
        const student = students[Math.floor(Math.random() * students.length)];
        const course = courses[Math.floor(Math.random() * courses.length)];
        
        const price = Number(course.price) || 29.99;
        const discount = Math.random() > 0.8 ? price * 0.2 : 0;
        const total = price - discount;

        // Create order entity
        const order = new Order();
        const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
        order.order_number = `ORD-${day.getTime()}-${i}-${randomSuffix}`;
        order.student_id = student.id;
        order.subtotal = price;
        order.discount_amount = discount;
        order.total_amount = total;
        order.status = OrderStatus.COMPLETED;
        order.created_at = day;
        order.completed_at = day;
        order.payment_method = 'STRIPE';

        const savedOrder = await orderRepo.save(order);

        const commissionRate = 0.2; // 20% platform fee
        const platformFee = total * commissionRate;
        const instructorAmount = total - platformFee;

        // Create order item
        const item = new OrderItem();
        item.order_id = savedOrder.id;
        item.course_id = course.id;
        item.instructor_id = course.instructorId;
        item.course_price = price;
        item.discount_amount = discount;
        item.final_price = total;
        item.commission_rate = commissionRate;
        item.platform_fee = platformFee;
        item.instructor_amount = instructorAmount;

        await orderItemRepo.save(item);
      }
    }

    console.log('Revenue seeding completed.');
  }
}
