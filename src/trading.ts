import ccxt, { Exchange, Market } from "ccxt";
import { Config } from "./config";
import { MarketInfo, OrderResult, BalanceInfo } from "./types";
import { getMinimumBaseAmount } from "./utils";
import { DatabaseService } from "./database";

export class TradingService {
  private exchange: Exchange;
  private marketInfo: MarketInfo | null = null;

  constructor() {
    const config = Config.getInstance().trading;
    const exchangeClass = ccxt[config.exchangeId as keyof typeof ccxt] as typeof Exchange;
    
    this.exchange = new exchangeClass({
      apiKey: config.publicKey,
      secret: config.privateKey,
      enableRateLimit: true,
    });

    if (config.sandbox) {
      this.exchange.setSandboxMode(true);
    }
  }

  public async initialize(): Promise<void> {
    const config = Config.getInstance().trading;
    const markets = await this.exchange.fetchMarkets();
    const market = markets.find((el) => el.symbol === config.pair);

    if (!market) {
      throw new Error(`Pair ${config.pair} is not supported`);
    }

    const [base, quote] = config.pair.split(":")[0].split("/");
    
    this.marketInfo = {
      symbol: config.pair,
      base,
      quote,
      market,
    };
  }

  public async placeOrder(): Promise<OrderResult> {
    if (!this.marketInfo) {
      throw new Error("Trading service not initialized");
    }

    const config = Config.getInstance().trading;
    const ticker = await this.exchange.fetchTicker(this.marketInfo.symbol);
    const price = ticker.bid;
    const amount = getMinimumBaseAmount(this.exchange, this.marketInfo.market, price);

    // Place order based on configured order type
    let orderPrice = price;
    console.log(`Placing ${config.orderType.toUpperCase()} order for ${amount} ${this.marketInfo.base}...`);

    if (config.orderType === 'limit') {
      await this.exchange.createOrder(this.marketInfo.symbol, "limit", "buy", amount, price);
      console.log(`Limit order placed at price ${price} ${this.marketInfo.quote}`);
    } else {
      // Market order - include price for exchanges that require it (like MEXC)
      const order = await this.exchange.createOrder(this.marketInfo.symbol, "market", "buy", amount, price);
      console.log(`Market order executed`);
      // For market orders, use the actual executed price if available
      if (order.price) {
        orderPrice = order.price;
        console.log(`Execution price: ${orderPrice} ${this.marketInfo.quote}`);
      }
    }

    const balance = await this.exchange.fetchBalance();
    const baseTotal = Number(balance[this.marketInfo.base].total);
    const quoteTotal = Number(balance[this.marketInfo.quote].total);

    const nextOrderInMs = Math.round(
      config.dcaDurationInMs / (config.dcaBudget / orderPrice / amount)
    );

    const orderResult = {
      amount,
      price: orderPrice,
      baseTotal,
      quoteTotal,
      nextOrderInMs,
    };

    // Save order to database
    const db = DatabaseService.getInstance();
    await db.saveOrder(orderResult, config.orderType);

    return orderResult;
  }

  public async getBalance(): Promise<BalanceInfo> {
    if (!this.marketInfo) {
      throw new Error("Trading service not initialized");
    }

    const balance = await this.exchange.fetchBalance();
    const baseTotal = Number(balance[this.marketInfo.base].total);
    const quoteTotal = Number(balance[this.marketInfo.quote].total);

    return {
      base: this.marketInfo.base,
      quote: this.marketInfo.quote,
      baseTotal,
      quoteTotal,
    };
  }

  public getMarketInfo(): MarketInfo {
    if (!this.marketInfo) {
      throw new Error("Trading service not initialized");
    }
    return this.marketInfo;
  }
}