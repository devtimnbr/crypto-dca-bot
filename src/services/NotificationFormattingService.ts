
import { OrderRecord, OrderStats } from './DatabaseService';
import { DailyStats, MonthlyStats } from './StatisticsService';
import { formatNumberWithPrecision } from '../utils';
import { Config } from '../config';

export class NotificationFormattingService {
  private config: Config;

  constructor() {
    this.config = Config.getInstance();
  }

  public formatGeneralStats(stats: OrderStats | null): string {
    if (!stats) {
      return '📊 *No orders placed yet*\n\nStart the bot to begin tracking your DCA strategy!';
    }

    const basePrecision = this.config.trading.baseCurrencyPrecision;
    const quotePrecision = this.config.trading.quoteCurrencyPrecision;

    const formattedAmount = formatNumberWithPrecision(stats.totalAmount, basePrecision);
    const formattedCost = formatNumberWithPrecision(stats.totalCost, quotePrecision);
    const formattedAvgPrice = formatNumberWithPrecision(stats.averagePrice, quotePrecision);
    const formattedBaseHoldings = formatNumberWithPrecision(stats.currentHoldings.base, basePrecision);
    const formattedQuoteHoldings = formatNumberWithPrecision(stats.currentHoldings.quote, quotePrecision);

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

  public formatRecentOrders(orders: OrderRecord[]): string {
    if (orders.length === 0) {
      return '📋 *No recent orders*\n\nNo orders have been placed yet.';
    }

    const basePrecision = this.config.trading.baseCurrencyPrecision;
    const quotePrecision = this.config.trading.quoteCurrencyPrecision;

    let message = `📋 *Recent ${orders.length} Orders*\n\n`;

    for (const order of orders) {
      const date = new Date(order.timestamp).toLocaleDateString();
      const time = new Date(order.timestamp).toLocaleTimeString();
      const formattedAmount = formatNumberWithPrecision(order.amount, basePrecision);
      const formattedPrice = formatNumberWithPrecision(order.price, quotePrecision);
      const formattedCost = formatNumberWithPrecision(order.cost, quotePrecision);

      message += `🔸 *${date} ${time}*\n`;
      message += `   Type: ${order.orderType.toUpperCase()}\n`;
      message += `   Amount: ${formattedAmount} ${order.base}\n`;
      message += `   Price: ${formattedPrice} ${order.quote}\n`;
      message += `   Cost: ${formattedCost} ${order.quote}\n\n`;
    }

    return message;
  }

  public formatDailyStats(dailyData: Record<string, DailyStats>, days: number): string {
    if (Object.keys(dailyData).length === 0) {
      return `📅 *No orders in the last ${days} days*`;
    }

    const basePrecision = this.config.trading.baseCurrencyPrecision;
    const quotePrecision = this.config.trading.quoteCurrencyPrecision;

    let message = `📅 *Daily Stats (Last ${days} days)*\n\n`;

    // Show last 7 days even if no orders
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString();
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

      const dayStats = dailyData[dateStr];
      if (dayStats) {
        const formattedAmount = formatNumberWithPrecision(dayStats.totalAmount, basePrecision);
        const formattedCost = formatNumberWithPrecision(dayStats.totalCost, quotePrecision);

        message += `🔸 *${dayName} ${dateStr}*\n`;
        message += `   Orders: ${dayStats.totalOrders} | `;
        message += `Amount: ${formattedAmount} ${dayStats.baseCurrency} | `;
        message += `Cost: ${formattedCost} ${dayStats.quoteCurrency}\n\n`;
      } else {
        message += `🔸 *${dayName} ${dateStr}*\n`;
        message += `   No orders\n\n`;
      }
    }

    return message;
  }

  public formatMonthlyStats(monthlyData: Record<string, MonthlyStats>, months: number): string {
    let message = `📊 *Monthly Performance (Last ${months} months)*\n\n`;

    const basePrecision = this.config.trading.baseCurrencyPrecision;
    const quotePrecision = this.config.trading.quoteCurrencyPrecision;

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStr = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });

      const monthStats = monthlyData[monthStr];
      if (monthStats) {
        const formattedAmount = formatNumberWithPrecision(monthStats.totalAmount, basePrecision);
        const formattedCost = formatNumberWithPrecision(monthStats.totalCost, quotePrecision);

        message += `🔸 *${monthStr}*\n`;
        message += `   Orders: ${monthStats.totalOrders} | `;
        message += `Invested: ${formattedCost} ${monthStats.quoteCurrency} | `;
        message += `Bought: ${formattedAmount} ${monthStats.baseCurrency}\n\n`;
      } else {
        message += `🔸 *${monthStr}*\n`;
        message += `   No orders\n\n`;
      }
    }

    return message;
  }
}

