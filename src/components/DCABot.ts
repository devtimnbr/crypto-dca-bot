
import { TradingService } from "../services/TradingService";
import { NotificationService } from "../services/NotificationService";
import { Config } from "../config";
import { DatabaseService } from "../services/DatabaseService";
import { sleep, dhm, printBanner } from "../utils";
import ccxt from "ccxt";

const ONE_HOUR_IN_MS = 60 * 60 * 1000;
const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;

export class DCABot {
  private isInsufficientFunds = false;

  constructor(
    private tradingService: TradingService,
    private notificationService: NotificationService,
    private database: DatabaseService,
  ) {}

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

  private async handleError(error: any): Promise<void> {
    console.error({ error });

    if (error instanceof ccxt.InsufficientFunds) {
      if (!this.isInsufficientFunds) {
        await this.notificationService.sendInsufficientFundsNotification();
        this.isInsufficientFunds = true;
      }
      await sleep(ONE_HOUR_IN_MS);
    } else if (error instanceof ccxt.NetworkError) {
      console.log('Network error, retrying in 30 seconds');
      await sleep(30000);
    } else if (error.code === 'SQLITE_READONLY') {
      console.error('Database is readonly. Please fix the file permissions. Retrying in 1 hour.');
      await sleep(ONE_HOUR_IN_MS);
    }
    else {
      await sleep(FIVE_MINUTES_IN_MS);
    }
  }
}
