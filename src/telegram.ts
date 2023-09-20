import { Balances, Market } from "ccxt";
import { Context, Telegraf } from "telegraf";
import { exchange } from "./main";
import { BASE_SYMBOL, PAIR, QUOTE_SYMBOL, TG_BOT_TOKEN, TG_CHAT_ID } from "./constants";
import { dhm, formatNumberWithPrecision, removeLeadingWhitespace } from "./utils";
import db from "./db";

export default class Telegram {
  tg: Telegraf<Context> | undefined;
  chatId: string = "";

  constructor() {
    const botToken = TG_BOT_TOKEN;
    const chatId = TG_CHAT_ID;

    if (!botToken || !chatId) {
      console.log("No TG_BOT_TOKEN or TG_CHAT_ID provided in environment variables");
      return;
    }

    this.tg = new Telegraf(botToken);
    this.chatId = chatId;

    this.setupCommands();

    // Start the bot
    this.tg.launch();

    this.sendMessage("bot started ...");
  }

  private setupCommands() {
    if (this.tg && this.chatId) {
      this.tg.telegram.setMyCommands([
        { command: "balance", description: "Returns balance" },
        { command: "status", description: "Returns status" },
        { command: "stats", description: "Returns stats" },
      ]);

      this.tg.command("balance", async () => {
        const balance: Balances = await exchange.fetchBalance();
        this.sendMessage(
          removeLeadingWhitespace(`💼 ${BASE_SYMBOL}: ${balance[QUOTE_SYMBOL].total}
          💰 ${QUOTE_SYMBOL}: ${balance[QUOTE_SYMBOL].total}`)
        );
      });

      this.tg.command("stats", async () => {
        const { avgPrice } = db.calculateAvgPriceSymbol(PAIR);
        const totalFees = db.calculateTotalFeesAndPercentageSymbol(PAIR);
        const { totalAmount } = db.calculateTotalAmountSymbol(PAIR);
        const { count } = db.countTradesSymbol(PAIR);

        const ticker = await exchange.fetchTicker(PAIR);
        // required for formatting numbers
        const markets = await exchange.fetchMarkets();
        const market = markets.find((el) => el.symbol === PAIR);
        db.calculateAvgPriceSymbol(PAIR);

        const initialInvest = totalAmount * avgPrice;
        const currentValue = totalAmount * ticker.bid;
        const roi = (((currentValue - initialInvest) / initialInvest) * 100).toFixed(2);

        ticker.bid;

        this.sendMessage(
          removeLeadingWhitespace(
            `📈 <b>Statistics for ${PAIR}</b>

            📊 <b>Total Volume</b>: ${formatNumberWithPrecision(totalAmount, market?.precision.amount)} ${BASE_SYMBOL}
            💼 <b>Total Invest</b>: ${formatNumberWithPrecision(
              initialInvest,
              market?.precision.amount
            )} ${QUOTE_SYMBOL}
            💸 <b>Total Fees</b>: ${formatNumberWithPrecision(
              totalFees.totalFees ? totalFees.totalFees : 0,
              market?.precision.price
            )} ${QUOTE_SYMBOL} 

            📈 <b>ROI</b>: ${roi}%
            💰 <b>Average Price</b>: ${formatNumberWithPrecision(avgPrice, market?.precision.price)} ${QUOTE_SYMBOL}
            💹 <b>Current Price</b>: ${ticker.bid} ${QUOTE_SYMBOL}
            🔄 <b>Total Trades</b>: ${count}
          `
          )
        );
      });

      this.tg.command("status", () => this.sendMessage("Running ..."));
    }
  }

  async sendMessage(msg: string, shouldLog = false) {
    if (shouldLog) {
      console.log(msg);
    }

    if (this.tg === undefined) {
      return;
    }

    try {
      await this.tg.telegram.sendMessage(this.chatId, msg, {
        parse_mode: "HTML",
      });
    } catch (error) {
      // telegram could be down: just log and dont throw error - bot should continue for next buy
      console.log("Error sending telegram message:");
    }
  }

  async sendBuyMessage({
    price,
    baseTotal,
    amount,
    quoteTotal,
    nextOrderInMs,
    market,
  }: {
    price: number;
    amount: number;
    baseTotal: number;
    quoteTotal: number;
    nextOrderInMs: number;
    market: Market;
  }) {
    const budgetDepletedInMs = nextOrderInMs * (quoteTotal / amount / price);
    const budgetDepletedAt = new Date(Date.now() + budgetDepletedInMs);

    const msg = removeLeadingWhitespace(`🟩🟩 <b>Trade Summary</b>:

    💼 <b>Got</b>: ${amount} ${BASE_SYMBOL}
    💰 <b>For</b>: ${formatNumberWithPrecision(price * amount, market.precision.price)} ${QUOTE_SYMBOL}
    
    💎 <b>${BASE_SYMBOL}</b>: ${formatNumberWithPrecision(baseTotal, market.precision.amount)} 
    💵 <b>${QUOTE_SYMBOL}</b>: ${formatNumberWithPrecision(quoteTotal, market.precision.price)}
    
    ⏱ <b>Depleted at</b>: ${budgetDepletedAt.toLocaleDateString()}
    ⏳ <b>Depleted in</b>: ${dhm(budgetDepletedInMs)}`);

    await this.sendMessage(msg, true);
  }
}
