
import { DCABot } from "./components/DCABot";
import { DatabaseService } from "./services/DatabaseService";
import { NotificationService } from "./services/NotificationService";
import { StatisticsService } from "./services/StatisticsService";
import { TradingService } from "./services/TradingService";
import { NotificationFormattingService } from "./services/NotificationFormattingService";

// Add global error handlers to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process, just log and continue
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log and continue
});

async function main(): Promise<void> {
  try {
    const databaseService = new DatabaseService();
    const tradingService = new TradingService(databaseService);
    const notificationFormattingService = new NotificationFormattingService();
    const statisticsService = new StatisticsService(databaseService, notificationFormattingService, tradingService);
    const notificationService = new NotificationService(tradingService, statisticsService);

    const bot = new DCABot(
      tradingService,
      notificationService,
      databaseService,
    );
    await bot.start();
  } catch (error) {
    console.error("Failed to start bot:", error);
    // Don't exit immediately, give some time for cleanup
    setTimeout(() => {
      process.exit(1);
    }, 5000);
  }
}

main().catch((error) => {
  console.error("Unhandled error in main:", error);
  // Don't exit immediately, give some time for cleanup
  setTimeout(() => {
    process.exit(1);
  }, 5000);
});