
import { OrderRecord, OrderStats } from './DatabaseService';
import { DailyStats, MonthlyStats } from './StatisticsService';
import { formatNumberWithPrecision } from '../utils';
import { Config } from '../config';
import { MarketData } from '../types';

export class NotificationFormattingService {
  private config: Config;

  constructor() {
    this.config = Config.getInstance();
  }

  public formatGeneralStats(stats: OrderStats | null, marketData: MarketData | null = null): string {
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

    // Add live market data if available
    if (marketData) {
      const currentPrice = formatNumberWithPrecision(marketData.currentPrice, quotePrecision);
      const priceChange = marketData.priceChange24h;
      const percentageChange = marketData.percentageChange24h;
      const changeSymbol = percentageChange >= 0 ? '📈' : '📉';
      const changeColor = percentageChange >= 0 ? '🟢' : '🔴';

      // Calculate portfolio value
      const portfolioValue = (stats.currentHoldings.base * marketData.currentPrice) + stats.currentHoldings.quote;
      const formattedPortfolioValue = formatNumberWithPrecision(portfolioValue, quotePrecision);

      // Calculate P&L
      const totalInvestedValue = stats.currentHoldings.base * stats.averagePrice + stats.currentHoldings.quote;
      const unrealizedPnL = portfolioValue - totalInvestedValue;
      const pnLPercentage = totalInvestedValue > 0 ? (unrealizedPnL / totalInvestedValue) * 100 : 0;
      const formattedPnL = formatNumberWithPrecision(unrealizedPnL, quotePrecision);
      const formattedPnLPercentage = formatNumberWithPrecision(pnLPercentage, 2);
      const pnLSymbol = unrealizedPnL >= 0 ? '🟢' : '🔴';

      // Calculate distance from average price
      const distanceFromAvg = marketData.currentPrice > 0 ? ((marketData.currentPrice - stats.averagePrice) / stats.averagePrice) * 100 : 0;
      const distanceSymbol = distanceFromAvg >= 0 ? '📈' : '📉';
      const formattedDistance = formatNumberWithPrecision(Math.abs(distanceFromAvg), 2);

      message += `\n💹 **Live Market Data:**\n`;
      message += `💵 Current Price: *${currentPrice} ${stats.quoteCurrency}*\n`;
      message += `${changeSymbol} 24h Change: *${changeColor} ${formatNumberWithPrecision(priceChange, quotePrecision)} (${formatNumberWithPrecision(percentageChange, 2)}%)*\n`;
      if (marketData.high24h > 0 && marketData.low24h > 0) {
        message += `📊 24h Range: *${formatNumberWithPrecision(marketData.low24h, quotePrecision)} - ${formatNumberWithPrecision(marketData.high24h, quotePrecision)} ${stats.quoteCurrency}*\n`;
      }
      if (marketData.volume24h > 0) {
        message += `📈 24h Volume: *${formatNumberWithPrecision(marketData.volume24h, basePrecision)} ${stats.baseCurrency}*\n`;
      }

      message += `\n💼 **Portfolio Performance:**\n`;
      message += `💰 Total Value: *${formattedPortfolioValue} ${stats.quoteCurrency}*\n`;
      message += `${pnLSymbol} Unrealized P&L: *${formattedPnL} ${stats.quoteCurrency} (${formattedPnLPercentage}%)*\n`;
      message += `${distanceSymbol} Distance from Avg: *${formattedDistance}%*\n`;
    }

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
    const [baseCurrency, quoteCurrency] = this.config.trading.pair.split(":")[0].split("/");

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
        message += `Amount: ${formattedAmount} ${baseCurrency} | `;
        message += `Cost: ${formattedCost} ${quoteCurrency}\n\n`;
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
    const [baseCurrency, quoteCurrency] = this.config.trading.pair.split(":")[0].split("/");

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
        message += `Invested: ${formattedCost} ${quoteCurrency} | `;
        message += `Bought: ${formattedAmount} ${baseCurrency}\n\n`;
      } else {
        message += `🔸 *${monthStr}*\n`;
        message += `   No orders\n\n`;
      }
    }

    return message;
  }
}

