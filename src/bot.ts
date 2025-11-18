import { TradingService } from "./trading";
import { NotificationService } from "./notifications";
import { Config } from "./config";
import { DatabaseService } from "./database";
import { sleep, dhm, printBanner } from "./utils";
import ccxt from "ccxt";

export class DCABot {
  private tradingService: TradingService;
  private notificationService: NotificationService;
  private database: DatabaseService;
  private isInsufficientFunds = false;

  constructor() {
    this.tradingService = new TradingService();
    this.notificationService = new NotificationService(this.tradingService);
    this.database = DatabaseService.getInstance();
  }

  public async start(): Promise<void> {
    printBanner();
    
    const config = Config.getInstance().trading;
    console.log(`Selected trading pair: ${config.pair}`);

    await this.tradingService.initialize();
    const marketInfo = this.tradingService.getMarketInfo();
    console.log(`Market initialized: ${marketInfo.base}/${marketInfo.quote}`);

    await this.runDCA();
  }

  private async runDCA(): Promise<void> {
    while (true) {
      try {
        // Check if we should place an order now
        const shouldPlace = await this.database.shouldPlaceOrderNow();
        if (!shouldPlace) {
          const timeUntilNext = await this.database.getTimeUntilNextOrder();
          if (timeUntilNext !== null && timeUntilNext > 0) {
            console.log(
              `Waiting ${dhm(timeUntilNext)} until ${new Date(
                Date.now() + timeUntilNext
              ).toLocaleString()} for next order`
            );
            await sleep(timeUntilNext);
            continue;
          }
        }

        // Place the order
        const orderResult = await this.tradingService.placeOrder();

        await this.notificationService.sendOrderNotification(orderResult);

        console.log(
          `Waiting ${dhm(orderResult.nextOrderInMs)} until ${new Date(
            Date.now() + orderResult.nextOrderInMs
          ).toLocaleString()} for next order`
        );

        this.isInsufficientFunds = false;
        await sleep(orderResult.nextOrderInMs);

      } catch (error) {
        await this.handleError(error);
      }
    }
  }

  private async handleError(error: unknown): Promise<void> {
    console.error({ error });

    if (error instanceof ccxt.InsufficientFunds) {
      if (!this.isInsufficientFunds) {
        await this.notificationService.sendInsufficientFundsNotification();
        this.isInsufficientFunds = true;
      }
      await sleep(1000 * 60 * 60); // 1 hour
    } else {
      await sleep(1000 * 60 * 5); // 5 minutes
    }
  }
}