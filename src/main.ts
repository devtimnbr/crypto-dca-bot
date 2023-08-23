import ccxt, { Balances, Exchange } from "ccxt";
import {
  SANDBOX,
  EXCHANGE_ID,
  PUBLIC_KEY,
  PRIVATE_KEY,
  PAIR,
  BUY_AMOUNT,
  DCA_DURATION_IN_MS,
  DCA_BUDGET,
} from "./constants";
import Telegram from "./telegram";
import { sleep, dhm, printBanner } from "./utils";

const exchangeClass = ccxt[EXCHANGE_ID as keyof typeof ccxt] as typeof Exchange;

export const exchange: Exchange = new exchangeClass({
  apiKey: PUBLIC_KEY,
  secret: PRIVATE_KEY,
  enableRateLimit: true,
});

if (SANDBOX) {
  exchange.setSandboxMode(true);
}

// optional
const tg = new Telegram();

// run the sript
(async () => {
  printBanner();
  console.log("Selected trading pair:", PAIR);

  let isInsufficientFunds = false;

  // split pair example: BTC/USDT:USDT
  const [base, quote] = PAIR?.split(":")[0].split("/");

  // process dna plan
  while (true) {
    // Get current quote price in base currency
    const ticker = await exchange.fetchTicker(PAIR);
    const price = ticker.last as number;

    try {
      // place market order
      await exchange.createOrder(PAIR, "market", "buy", BUY_AMOUNT);

      const balance = (await exchange.fetchBalance()) as Balances;

      const baseTotal = Number(balance[base].total);
      const quoteTotal = Number(balance[quote].total);

      // Calculate when to place next dca order
      const nextOrderInMs = Math.round(DCA_DURATION_IN_MS / (DCA_BUDGET / price / BUY_AMOUNT));
      const budgetDepletedInMs = nextOrderInMs * (quoteTotal / BUY_AMOUNT / price);
      const budgetDepletedAt = new Date(Date.now() + budgetDepletedInMs);

      tg.sendBuyMessage({ base, quote, price, baseTotal, quoteTotal, budgetDepletedAt, budgetDepletedInMs });

      console.log(
        `Waiting ${dhm(nextOrderInMs)} until ${new Date(Date.now() + nextOrderInMs).toLocaleString()} for next order`
      );

      isInsufficientFunds = false;
      // sleep for next buy
      await sleep(nextOrderInMs);
    } catch (error) {
      console.error({ error });
      if (error instanceof ccxt.InsufficientFunds) {
        if (!isInsufficientFunds) {
          tg.sendMessage("🟥 Insufficient Funds...", true);
          isInsufficientFunds = true;
        }
        // wait 1h and retry - InsufficientFunds
        await sleep(1000 * 60 * 60);
        continue;
      } else {
        // wait 5m and retry - exchange could be down
        await sleep(1000 * 60 * 5);
      }
    }
  }
})();