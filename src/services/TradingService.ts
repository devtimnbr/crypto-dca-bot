
import ccxt, { Exchange, Market } from "ccxt";
import { Config } from "../config";
import { MarketInfo, OrderResult, BalanceInfo, MarketData } from "../types";
import { getMinimumBaseAmount, formatNumberWithPrecision } from "../utils";
import { DatabaseService } from "./DatabaseService";

export class TradingService {
  private exchange: Exchange;
  private marketInfo: MarketInfo | null = null;

  constructor(private databaseService: DatabaseService) {
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
    let amount = getMinimumBaseAmount(this.exchange, this.marketInfo.market, price);

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
      // For market orders, use the actual executed price and amount if available
      if (order.price) {
        orderPrice = order.price;
        console.log(`Execution price: ${orderPrice} ${this.marketInfo.quote}`);
      }
      // Use the actual filled amount from exchange if available and reasonable
      // Some exchanges may return incorrect values, so validate against the original request
      const executedAmount = order.filled || amount;

      // Basic sanity check: executed amount should be close to requested amount
      // For small orders like this, we expect executed amount to be within reasonable bounds
      const expectedUsdValue = executedAmount * orderPrice;
      const originalAmount = getMinimumBaseAmount(this.exchange, this.marketInfo.market, price);

      // If the executed amount value is way off from the expected order size, be suspicious
      if (executedAmount > 0 && expectedUsdValue <= originalAmount * orderPrice * 10) {
        amount = executedAmount;
        console.log(`Order executed: ${amount} ${this.marketInfo.base} at ${orderPrice} ${this.marketInfo.quote} (${formatNumberWithPrecision(expectedUsdValue, 2)} ${this.marketInfo.quote})`);
      } else {
        console.log(`Warning: Executed amount seems unreasonable (${executedAmount} ${this.marketInfo.base} = ${formatNumberWithPrecision(expectedUsdValue, 2)} ${this.marketInfo.quote}), using requested amount ${originalAmount}`);
        amount = originalAmount;
      }
    }

    const balance = await this.exchange.fetchBalance();
    const baseTotal = Number(balance[this.marketInfo.base].total);
    const quoteTotal = Number(balance[this.marketInfo.quote].total);

    const orderCost = amount * orderPrice;
    const nextOrderInMs = Math.round(
      (orderCost * config.dcaDurationInMs) / config.dcaBudget
    );

    const orderResult = {
      amount,
      price: orderPrice,
      baseTotal,
      quoteTotal,
      nextOrderInMs,
    };

    // Save order to database
    await this.databaseService.saveOrder(orderResult, config.orderType);

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

  public async getCurrentTicker() {
    if (!this.marketInfo) {
      throw new Error("Trading service not initialized");
    }
    return await this.exchange.fetchTicker(this.marketInfo.symbol);
  }

  public async getMarketData(): Promise<MarketData> {
    if (!this.marketInfo) {
      throw new Error("Trading service not initialized");
    }

    const ticker = await this.exchange.fetchTicker(this.marketInfo.symbol);

    return {
      currentPrice: ticker.last || ticker.bid || 0,
      priceChange24h: ticker.change || 0,
      percentageChange24h: ticker.percentage || 0,
      high24h: ticker.high || 0,
      low24h: ticker.low || 0,
      volume24h: ticker.baseVolume || 0,
    };
  }

  public getMarketInfo(): MarketInfo {
    if (!this.marketInfo) {
      throw new Error("Trading service not initialized");
    }
    return this.marketInfo;
  }
}
