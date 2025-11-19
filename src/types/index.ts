
export interface TradingConfig {
  sandbox: boolean;
  exchangeId: string;
  publicKey: string;
  privateKey: string;
  pair: string;
  dcaDurationInMs: number;
  dcaBudget: number;
  minQuoteAmount?: number;
  minBaseAmount?: number;
  orderType: 'market' | 'limit';
  baseCurrencyPrecision: number;
  quoteCurrencyPrecision: number;
}

export interface TelegramConfig {
  botToken?: string;
  chatId?: string;
}

export interface AppConfig {
  trading: TradingConfig;
  telegram: TelegramConfig;
}

export interface MarketInfo {
  symbol: string;
  base: string;
  quote: string;
  market: any;
}

export interface OrderResult {
  amount: number;
  price: number;
  baseTotal: number;
  quoteTotal: number;
  nextOrderInMs: number;
}

export interface BalanceInfo {
  base: string;
  quote: string;
  baseTotal: number;
  quoteTotal: number;
}
