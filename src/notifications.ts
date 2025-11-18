import { Context, Telegraf } from "telegraf";
import { Config } from "./config";
import { TradingService } from "./trading";
import { StatisticsService } from "./statistics";
import { dhm, formatNumberWithPrecision, removeLeadingWhitespace } from "./utils";
import { OrderResult, BalanceInfo } from "./types";

export class NotificationService {
  private telegram: Telegraf<Context> | undefined;
  private chatId: string = "";
  private tradingService: TradingService;
  private statsService: StatisticsService;

  constructor(tradingService: TradingService) {
    this.tradingService = tradingService;
    this.statsService = StatisticsService.getInstance();
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
        const msg = `${marketInfo.base}: ${balance.baseTotal}\n${marketInfo.quote}: ${balance.quoteTotal}`;
        this.sendMessage(msg);
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

    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Determine parse mode based on message content
      const parseMode = message.includes('*') ? "Markdown" : "HTML";

      try {
        await this.telegram.telegram.sendMessage(this.chatId, message, {
          parse_mode: parseMode,
        });
        return; // Success, exit the retry loop
      } catch (error) {
        console.log(`Error sending Telegram message (attempt ${attempt}/${maxRetries}):`, error);

        if (attempt === maxRetries) {
          console.log("Failed to send Telegram message after all retries");
          return;
        }

        // Wait before retrying with exponential backoff
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt - 1)));
      }
    }
  }

  public async sendOrderNotification(orderResult: OrderResult): Promise<void> {
    const marketInfo = this.tradingService.getMarketInfo();
    const config = Config.getInstance().trading;

    const budgetDepletedInMs = orderResult.nextOrderInMs *
      (orderResult.quoteTotal / orderResult.amount / orderResult.price);
    const budgetDepletedAt = new Date(Date.now() + budgetDepletedInMs);

    const message = removeLeadingWhitespace(`
      💰 <b>Purchase Completed</b> 💰

      <b>📊 Order Details:</b>
      ━━━━━━━━━━━━━━━━━━
      🛒 <b>Bought:</b> ${formatNumberWithPrecision(orderResult.amount, marketInfo.market.precision?.amount || 8)} ${marketInfo.base}
      💵 <b>Cost:</b> ${formatNumberWithPrecision(orderResult.price * orderResult.amount, marketInfo.market.precision?.price || 2)} ${marketInfo.quote}
      📍 <b>Price:</b> ${formatNumberWithPrecision(orderResult.price, marketInfo.market.precision?.price || 2)} ${marketInfo.quote}

      <b>🏦 Current Balance:</b>
      ━━━━━━━━━━━━━━━━━━
      ${marketInfo.base}: ${formatNumberWithPrecision(orderResult.baseTotal, marketInfo.market.precision?.amount || 8)}
      ${marketInfo.quote}: ${formatNumberWithPrecision(orderResult.quoteTotal, marketInfo.market.precision?.price || 2)}

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