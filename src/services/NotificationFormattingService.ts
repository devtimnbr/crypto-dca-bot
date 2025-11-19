import { OrderRecord, OrderStats } from './DatabaseService';
import { DailyStats, MonthlyStats } from './StatisticsService';

export class NotificationFormattingService {
  public formatGeneralStats(stats: OrderStats | null): string {
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

  public formatRecentOrders(orders: OrderRecord[]): string {
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

  public formatDailyStats(dailyData: Record<string, DailyStats>, days: number): string {
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

  public formatMonthlyStats(monthlyData: Record<string, MonthlyStats>, months: number): string {
    let message = `📊 *Monthly Performance (Last ${months} months)*\n\n`;

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStr = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });

      const monthStats = monthlyData[monthStr];
      if (monthStats) {
        const formattedAmount = this.formatNumber(monthStats.totalAmount);
        const formattedCost = this.formatNumber(monthStats.totalCost);

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

  private formatNumber(num: number): string {
    if (num >= 1000) {
      return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    } else if (num >= 1) {
      return num.toFixed(4).replace(/\.?0+$/, '');
    } else {
      return num.toFixed(8).replace(/\.?0+$/, '');
    }
  }
}
