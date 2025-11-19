import { Context, Telegraf } from "telegraf";
import { Config } from "../config";
import { TradingService } from "./TradingService";
import { StatisticsService } from "./StatisticsService";
import { dhm, formatNumberWithPrecision, removeLeadingWhitespace } from "../utils";
import { OrderResult, BalanceInfo } from "../types";

export class NotificationService {
  private telegram: Telegraf<Context> | undefined;
  private chatId: string = "";

  constructor(
    private tradingService: TradingService,
    private statsService: StatisticsService,
  ) {
    this.initializeTelegram();
  }
  private initializeTelegram(): void {
    const config = Config.getInstance().telegram;
    
    if (!config.botToken || !config.chatId) {
      console.log("No Telegram configuration provided - notifications disabled");
      return;
    }

    this.telegram = new Telegraf(config.botToken);
    this.chatId = config.chatId;
    this.setupCommands();
    this.telegram.launch();
    this.sendMessage("🤖 Crypto DCA Bot v2 started...");
  }


  private setupCommands(): void {
    if (!this.telegram) return;

    this.telegram.telegram.setMyCommands([
      { command: "balance", description: "Returns current balance" },
      { command: "status", description: "Returns bot status" },
      { command: "stats", description: "Show trading statistics" },
      { command: "recent", description: "Show recent orders" },
      { command: "daily", description: "Show daily stats (last 7 days)" },
      { command: "monthly", description: "Show monthly performance" },
    ]);

    this.telegram.command("balance", async () => {
      try {
        const balance = await this.tradingService.getBalance();
        const marketInfo = this.tradingService.getMarketInfo();
        
        const config = Config.getInstance().trading;
        const message = removeLeadingWhitespace(`
          💼 <b>Current Balance</b> 💼

          ━━━━━━━━━━━━━━━━━━
          🪙 <b>${marketInfo.base}:</b> ${formatNumberWithPrecision(balance.baseTotal, Math.max(config.baseCurrencyPrecision, 8))}
          💵 <b>${marketInfo.quote}:</b> ${formatNumberWithPrecision(balance.quoteTotal, config.quoteCurrencyPrecision)}
        `);
        
        this.sendMessage(message);
      } catch (error) {
        this.sendMessage("❌ Error fetching balance");
      }
    });

    this.telegram.command("status", () => {
      this.sendMessage("🟢 Bot is running and actively trading");
    });

    this.telegram.command("stats", async () => {
      try {
        const stats = await this.statsService.getGeneralStats();
        this.sendMessage(stats);
      } catch (error) {
        this.sendMessage("❌ Error fetching statistics");
      }
    });

    this.telegram.command("recent", async () => {
      try {
        const recent = await this.statsService.getRecentOrders();
        this.sendMessage(recent);
      } catch (error) {
        this.sendMessage("❌ Error fetching recent orders");
      }
    });

    this.telegram.command("daily", async () => {
      try {
        const daily = await this.statsService.getDailyStats();
        this.sendMessage(daily);
      } catch (error) {
        this.sendMessage("❌ Error fetching daily statistics");
      }
    });

    this.telegram.command("monthly", async () => {
      try {
        const monthly = await this.statsService.getMonthlyStats();
        this.sendMessage(monthly);
      } catch (error) {
        this.sendMessage("❌ Error fetching monthly statistics");
      }
    });
  }

  public async sendMessage(message: string, shouldLog = false): Promise<void> {
    if (shouldLog) {
      console.log(message);
    }

    if (!this.telegram) return;

    const maxRetries = 5; // Increase retries for network issues
    const baseRetryDelay = 2000; // Start with 2 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Determine parse mode based on message content
      const parseMode = message.includes('*') ? "Markdown" : "HTML";

      try {
        await this.telegram.telegram.sendMessage(this.chatId, message, {
          parse_mode: parseMode,
          disable_web_page_preview: true,
        });
        return; // Success, exit the retry loop
      } catch (error: any) {
        // Log only essential error info, not full stack trace for network errors
        const isNetworkError = error.code === 'ECONNRESET' ||
                              error.code === 'ECONNREFUSED' ||
                              error.code === 'ETIMEDOUT' ||
                              error.type === 'system';

        if (isNetworkError) {
          console.log(`Network error sending Telegram message (attempt ${attempt}/${maxRetries}): ${error.code || error.type}`);
        } else {
          console.log(`Error sending Telegram message (attempt ${attempt}/${maxRetries}): ${error.message || error}`);
        }

        if (attempt === maxRetries) {
          console.log("Failed to send Telegram message after all retries");
          return;
        }

        // Calculate retry delay with exponential backoff and jitter
        const exponentialDelay = baseRetryDelay * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 1000; // Add random jitter up to 1 second
        const retryDelay = Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds

        console.log(`Retrying in ${Math.round(retryDelay/1000)} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  public async sendOrderNotification(orderResult: OrderResult): Promise<void> {
    const marketInfo = this.tradingService.getMarketInfo();
    const config = Config.getInstance().trading;

    // DEBUG: Log the raw orderResult values
    console.log('DEBUG sendOrderNotification:', {
      amount: orderResult.amount,
      price: orderResult.price,
      baseTotal: orderResult.baseTotal,
      quoteTotal: orderResult.quoteTotal,
      baseCurrencyPrecision: config.baseCurrencyPrecision
    });

    // Calculate budget depletion based on remaining quote balance and this order's cost
    const orderCost = orderResult.amount * orderResult.price;
    const remainingOrders = Math.floor(orderResult.quoteTotal / orderCost);
    const budgetDepletedInMs = remainingOrders * orderResult.nextOrderInMs;
    const budgetDepletedAt = new Date(Date.now() + budgetDepletedInMs);

    // DEBUG: Test the exact formatting being used
    const precision = Math.max(config.baseCurrencyPrecision, 8);
    const formattedAmount = formatNumberWithPrecision(orderResult.amount, precision);
    console.log('DEBUG formatting:', {
      rawAmount: orderResult.amount,
      precision: precision,
      formattedAmount: formattedAmount
    });

    const message = removeLeadingWhitespace(`
      💰 <b>Purchase Completed</b> 💰

      <b>📊 Order Details:</b>
      ━━━━━━━━━━━━━━━━━━
      🛒 <b>Bought:</b> ${formattedAmount} ${marketInfo.base}
      💵 <b>Cost:</b> ${formatNumberWithPrecision(orderResult.amount * orderResult.price, config.quoteCurrencyPrecision)} ${marketInfo.quote}
      📍 <b>Price:</b> ${formatNumberWithPrecision(orderResult.price, config.quoteCurrencyPrecision)} ${marketInfo.quote}

      <b>🏦 Current Balance:</b>
      ━━━━━━━━━━━━━━━━━━
      ${marketInfo.base}: ${formatNumberWithPrecision(orderResult.baseTotal, Math.max(config.baseCurrencyPrecision, 8))}
      ${marketInfo.quote}: ${formatNumberWithPrecision(orderResult.quoteTotal, config.quoteCurrencyPrecision)}

      <b>⏰ Budget Projection:</b>
      ━━━━━━━━━━━━━━━━━━
      📅 <b>Depleted:</b> ${budgetDepletedAt.toLocaleDateString()}
      ⏳ <b>Time left:</b> ${dhm(budgetDepletedInMs)}

      🟩 <b>Status: Active</b>
    `);

    await this.sendMessage(message, true);
  }

  public async sendInsufficientFundsNotification(): Promise<void> {
    await this.sendMessage("🟥 Insufficient Funds...", true);
  }
}
