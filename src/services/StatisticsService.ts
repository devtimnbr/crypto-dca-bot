
import { DatabaseService, OrderRecord, OrderStats } from './DatabaseService';
import { NotificationFormattingService } from './NotificationFormattingService';
import { TradingService } from './TradingService';
import { MarketData } from '../types';

export interface DailyStats {
  date: string;
  totalOrders: number;
  totalAmount: number;
  totalCost: number;
  averagePrice: number;
}

export interface MonthlyStats {
  month: string;
  totalOrders: number;
  totalAmount: number;
  totalCost: number;
  averagePrice: number;
}

export class StatisticsService {
  constructor(
    private db: DatabaseService,
    private formattingService: NotificationFormattingService,
    private tradingService: TradingService,
  ) {}

  public async getGeneralStats(): Promise<string> {
    const stats = await this.db.getOrderStats();
    const marketData = await this.tradingService.getMarketData().catch(() => null); // Don't fail if market data unavailable
    return this.formattingService.formatGeneralStats(stats, marketData);
  }

  public async getRecentOrders(limit: number = 5): Promise<string> {
    const orders = await this.db.getRecentOrders(limit);
    return this.formattingService.formatRecentOrders(orders);
  }

  public async getDailyStats(days: number = 7): Promise<string> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days + 1);

    const orders = await this.db.getOrdersInDateRange(startDate, endDate);
    const dailyData = this.groupOrdersByDate(orders);

    return this.formattingService.formatDailyStats(dailyData, days);
  }

  public async getMonthlyStats(months: number = 6): Promise<string> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - months + 1);

    const orders = await this.db.getOrdersInDateRange(startDate, endDate);
    const monthlyData = this.groupOrdersByMonth(orders);
    
    if (Object.keys(monthlyData).length === 0) {
      return '📅 *No orders placed yet*';
    }

    return this.formattingService.formatMonthlyStats(monthlyData, months);
  }

  private groupOrdersByDate(orders: OrderRecord[]): Record<string, DailyStats> {
    const grouped: Record<string, DailyStats> = {};

    for (const order of orders) {
      const date = new Date(order.timestamp).toLocaleDateString();

      if (!grouped[date]) {
        grouped[date] = {
          date,
          totalOrders: 0,
          totalAmount: 0,
          totalCost: 0,
          averagePrice: 0
        };
      }

      const dayStats = grouped[date];
      dayStats.totalOrders++;
      dayStats.totalAmount += order.amount;
      dayStats.totalCost += order.cost;
      dayStats.averagePrice = dayStats.totalCost / dayStats.totalAmount;
    }

    return grouped;
  }

  private groupOrdersByMonth(orders: OrderRecord[]): Record<string, MonthlyStats> {
    const grouped: Record<string, MonthlyStats> = {};

    for (const order of orders) {
      const date = new Date(order.timestamp);
      const monthStr = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });

      if (!grouped[monthStr]) {
        grouped[monthStr] = {
          month: monthStr,
          totalOrders: 0,
          totalAmount: 0,
          totalCost: 0,
          averagePrice: 0
        };
      }

      const monthStats = grouped[monthStr];
      monthStats.totalOrders++;
      monthStats.totalAmount += order.amount;
      monthStats.totalCost += order.cost;
      monthStats.averagePrice = monthStats.totalCost / monthStats.totalAmount;
    }

    return grouped;
  }
}
