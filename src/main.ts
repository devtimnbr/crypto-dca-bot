
import { DCABot } from "./components/DCABot";
import { DatabaseService } from "./services/DatabaseService";
import { NotificationService } from "./services/NotificationService";
import { StatisticsService } from "./services/StatisticsService";
import { TradingService } from "./services/TradingService";
import { NotificationFormattingService } from "./services/NotificationFormattingService";

async function main(): Promise<void> {
  try {
    const databaseService = new DatabaseService();
    const tradingService = new TradingService(databaseService);
    const notificationFormattingService = new NotificationFormattingService();
    const statisticsService = new StatisticsService(databaseService, notificationFormattingService);
    const notificationService = new NotificationService(tradingService, statisticsService);
    
    const bot = new DCABot(
      tradingService,
      notificationService,
      databaseService,
    );
    await bot.start();
  } catch (error) {
    console.error("Failed to start bot:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});