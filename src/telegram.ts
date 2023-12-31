import { Balances, Market } from "ccxt";
import { Context, Telegraf } from "telegraf";
import { exchange } from "./main";
import { TG_BOT_TOKEN, TG_CHAT_ID } from "./constants";
import { dhm, formatNumberWithPrecision, removeLeadingWhitespace } from "./utils";

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
      ]);

      this.tg.command("balance", async () => {
        const balance: Balances = await exchange.fetchBalance();
        const quoteBaseCurrencies = process.env.PAIR?.split(":")[0]?.split("/") as string[];
        const msg = quoteBaseCurrencies.map((c) => `${c}: ${balance[c].total}`).join("\n");
        this.sendMessage(msg);
      });

      this.tg.command("status", () => this.sendMessage("Running ..."));
    }
  }

  async sendMessage(msg: string, shouldLog = false) {
    if (shouldLog) {
      console.log(msg);
    }

    if (!this.tg) {
      return;
    }

    try {
      await this.tg.telegram.sendMessage(this.chatId, msg, {
        parse_mode: "HTML",
      });
    } catch (error) {
      // telegram could be down: just log and dont throw error - bot should continue for next buy
      console.log("Error sending telegram message:", error);
    }
  }

  async sendBuyMessage({
    base,
    price,
    baseTotal,
    amount,
    quoteTotal,
    nextOrderInMs,
    quote,
    market,
  }: {
    base: string;
    price: number;
    amount: number;
    baseTotal: number;
    quoteTotal: number;
    nextOrderInMs: number;
    market: Market;
    quote: string;
  }) {
    const budgetDepletedInMs = nextOrderInMs * (quoteTotal / amount / price);
    const budgetDepletedAt = new Date(Date.now() + budgetDepletedInMs);

    const msg = removeLeadingWhitespace(`🟩🟩
    
    <b>Got</b>: ${amount} ${base}
    <b>For</b>: ${formatNumberWithPrecision(price * amount, market.precision.price)} ${quote}

    <b>${base}</b>: ${formatNumberWithPrecision(baseTotal, market.precision.amount)} 
    <b>${quote}</b>: ${formatNumberWithPrecision(quoteTotal, market.precision.price)}

    <b>Depleted at</b>: ${budgetDepletedAt.toLocaleDateString()}
    <b>Depleted in</b>: ${dhm(budgetDepletedInMs)}`);

    await this.sendMessage(msg, true);
  }
}
