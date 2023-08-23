import { Balances } from "ccxt";
import { Context, Telegraf } from "telegraf";
import { exchange } from "./main";
import { BASE_DECIMALS, BUY_AMOUNT, QUOTE_DECIMALS, TG_BOT_TOKEN, TG_CHAT_ID } from "./constants";
import { dhm, removeLeadingWhitespace } from "./utils";

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
      this.tg.telegram.sendMessage(this.chatId, msg, {
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
    quoteTotal,
    budgetDepletedAt,
    budgetDepletedInMs,
    quote,
  }: {
    base: string;
    price: number;
    baseTotal: number;
    quoteTotal: number;
    budgetDepletedAt: Date;
    budgetDepletedInMs: number;
    quote: string;
  }) {
    const msg = removeLeadingWhitespace(`🟩🟩

    <b>Amount</b>: ${BUY_AMOUNT} ${base}
    <b>For</b>: ${(price * BUY_AMOUNT).toFixed(2)} ${quote}

    <b>Base</b>: ${baseTotal.toFixed(BASE_DECIMALS)} ${base}
    <b>Quote</b>: ${quoteTotal.toFixed(QUOTE_DECIMALS + 2)} ${quote}

    <b>Depleted at</b>: ${budgetDepletedAt.toLocaleDateString()}
    <b>Depleted in</b>: ${dhm(budgetDepletedInMs)}`);

    this.sendMessage(msg, true);
  }
}