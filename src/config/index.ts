
import ccxt from "ccxt";
import dotenv from "dotenv";
import { cleanEnv, str, bool, num } from "envalid";
import { AppConfig, TradingConfig, TelegramConfig } from "../types";

dotenv.config();

const env = cleanEnv(process.env, {
  SANDBOX: bool(),
  EXCHANGE_ID: str({ choices: ccxt.exchanges }),
  PUBLIC_KEY: str(),
  PRIVATE_KEY: str(),
  PAIR: str(),
  DCA_DURATION_IN_MS: num(),
  DCA_BUDGET: num(),
  MIN_QUOTE_AMOUNT: num({ default: 0 }),
  MIN_BASE_AMOUNT: num({ default: 0 }),
  ORDER_TYPE: str({ choices: ['market', 'limit'], default: 'market' }),
  TG_BOT_TOKEN: str({ default: "" }),
  TG_CHAT_ID: str({ default: "" }),
  BASE_CURRENCY_PRECISION: num({ default: 8 }),
  QUOTE_CURRENCY_PRECISION: num({ default: 2 }),
});

export class Config {
  private static instance: Config;
  private _config: AppConfig;

  private constructor() {
    this._config = this.buildConfig();
  }

  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  private buildConfig(): AppConfig {
    const trading: TradingConfig = {
      sandbox: env.SANDBOX,
      exchangeId: env.EXCHANGE_ID,
      publicKey: env.PUBLIC_KEY,
      privateKey: env.PRIVATE_KEY,
      pair: env.PAIR,
      dcaDurationInMs: env.DCA_DURATION_IN_MS,
      dcaBudget: env.DCA_BUDGET,
      minQuoteAmount: env.MIN_QUOTE_AMOUNT > 0 ? env.MIN_QUOTE_AMOUNT : undefined,
      minBaseAmount: env.MIN_BASE_AMOUNT > 0 ? env.MIN_BASE_AMOUNT : undefined,
      orderType: env.ORDER_TYPE as 'market' | 'limit',
      baseCurrencyPrecision: env.BASE_CURRENCY_PRECISION,
      quoteCurrencyPrecision: env.QUOTE_CURRENCY_PRECISION,
    };

    const telegram: TelegramConfig = {
      botToken: env.TG_BOT_TOKEN || undefined,
      chatId: env.TG_CHAT_ID || undefined,
    };

    return { trading, telegram };
  }

  public get config(): AppConfig {
    return this._config;
  }

  public get trading(): TradingConfig {
    return this._config.trading;
  }

  public get telegram(): TelegramConfig {
    return this._config.telegram;
  }
}
