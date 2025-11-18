import { DatabaseService, OrderRecord, OrderStats } from './database';
import { Config } from './config';

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

export interface YearlyStats {
  year: string;
  totalOrders: number;
  totalAmount: number;
  totalCost: number;
  averagePrice: number;
}

export class StatisticsService {
  private static instance: StatisticsService;
  private db: DatabaseService;

  private constructor() {
    this.db = DatabaseService.getInstance();
  }

  public static getInstance(): StatisticsService {
    if (!StatisticsService.instance) {
      StatisticsService.instance = new StatisticsService();
    }
    return StatisticsService.instance;
  }

  public async getGeneralStats(): Promise<string> {
    const stats = await this.db.getOrderStats();
    const config = Config.getInstance().trading;

    if (!stats) {
      return '📊 *No orders placed yet*\n\nStart the bot to begin tracking your DCA strategy!';
    }

    const formattedAmount = this.formatNumber(stats.totalAmount);
    const formattedCost = this.formatNumber(stats.totalCost);
    const formattedAvgPrice = this.formatNumber(stats.averagePrice);
    const formattedBaseHoldings = this.formatNumber(stats.currentHoldings.base);
    const formattedQuoteHoldings = this.formatNumber(stats.currentHoldings.quote);

    let message = `📊 *Trading Statistics*\n\n`;
    message += `📈 **${stats.baseCurrency}/${stats.quoteCurrency}**\n`;
    message += `🔸 Total Orders: *${stats.totalOrders}*\n`;
    message += `💰 Total Invested: *${formattedCost} ${stats.quoteCurrency}*\n`;
    message += `🪙 Total Acquired: *${formattedAmount} ${stats.baseCurrency}*\n`;
    message += `📊 Average Price: *${formattedAvgPrice} ${stats.quoteCurrency}*\n`;
    message += `📅 First Order: *${stats.firstOrderDate}*\n`;
    message += `📅 Last Order: *${stats.lastOrderDate}*\n\n`;
    message += `💼 **Current Holdings:**\n`;
    message += `🔸 ${stats.baseCurrency}: *${formattedBaseHoldings}*\n`;
    message += `🔸 ${stats.quoteCurrency}: *${formattedQuoteHoldings}*\n`;

    return message;
  }

  public async getRecentOrders(limit: number = 5): Promise<string> {
    const orders = await this.db.getRecentOrders(limit);

    if (orders.length === 0) {
      return '📋 *No recent orders*\n\nNo orders have been placed yet.';
    }

    let message = `📋 *Recent ${orders.length} Orders*\n\n`;

    for (const order of orders) {
      const date = new Date(order.timestamp).toLocaleDateString();
      const time = new Date(order.timestamp).toLocaleTimeString();
      const formattedAmount = this.formatNumber(order.amount);
      const formattedPrice = this.formatNumber(order.price);
      const formattedCost = this.formatNumber(order.cost);

      message += `🔸 *${date} ${time}*\n`;
      message += `   Type: ${order.orderType.toUpperCase()}\n`;
      message += `   Amount: ${formattedAmount} ${order.base}\n`;
      message += `   Price: ${formattedPrice} ${order.quote}\n`;
      message += `   Cost: ${formattedCost} ${order.quote}\n\n`;
    }

    return message;
  }

  public async getDailyStats(days: number = 7): Promise<string> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days + 1);

    const orders = await this.db.getOrdersInDateRange(startDate, endDate);
    const dailyData = this.groupOrdersByDate(orders);

    if (Object.keys(dailyData).length === 0) {
      return `📅 *No orders in the last ${days} days*`;
    }

    let message = `📅 *Daily Stats (Last ${days} days)*\n\n`;

    // Show last 7 days even if no orders
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString();
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

      const dayStats = dailyData[dateStr];
      if (dayStats) {
        const formattedAmount = this.formatNumber(dayStats.totalAmount);
        const formattedCost = this.formatNumber(dayStats.totalCost);
        const formattedAvgPrice = this.formatNumber(dayStats.averagePrice);

        message += `🔸 *${dayName} ${dateStr}*\n`;
        message += `   Orders: ${dayStats.totalOrders} | `;
        message += `Amount: ${formattedAmount} | `;
        message += `Cost: ${formattedCost}\n\n`;
      } else {
        message += `🔸 *${dayName} ${dateStr}*\n`;
        message += `   No orders\n\n`;
      }
    }

    return message;
  }

  public async getMonthlyStats(months: number = 6): Promise<string> {
    const stats = await this.db.getOrderStats();

    if (!stats) {
      return '📅 *No orders placed yet*';
    }

    // Get all orders to group by month
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - months + 1);

    const orders = await this.db.getOrdersInDateRange(startDate, endDate);
    const monthlyData = this.groupOrdersByMonth(orders);

    let message = `📊 *Monthly Performance (Last ${months} months)*\n\n`;

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStr = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });

      const monthStats = monthlyData[monthStr];
      if (monthStats) {
        const formattedAmount = this.formatNumber(monthStats.totalAmount);
        const formattedCost = this.formatNumber(monthStats.totalCost);
        const formattedAvgPrice = this.formatNumber(monthStats.averagePrice);

        message += `🔸 *${monthStr}*\n`;
        message += `   Orders: ${monthStats.totalOrders} | `;
        message += `Invested: ${formattedCost} | `;
        message += `Bought: ${formattedAmount}\n\n`;
      } else {
        message += `🔸 *${monthStr}*\n`;
        message += `   No orders\n\n`;
      }
    }

    return message;
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

  private formatNumber(num: number): string {
    // Format based on the magnitude
    if (num >= 1000) {
      return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    } else if (num >= 1) {
      return num.toFixed(4).replace(/\.?0+$/, '');
    } else {
      // For very small numbers (< 1), show more precision
      return num.toFixed(8).replace(/\.?0+$/, '');
    }
  }
}