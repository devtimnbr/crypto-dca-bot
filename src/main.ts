import ccxt, { Balances, Exchange } from "ccxt";
import Telegram from "./telegram";
import { sleep, dhm, printBanner, getMinimumQuoteAmount } from "./utils";
import {
  SANDBOX,
  EXCHANGE_ID,
  PUBLIC_KEY,
  PRIVATE_KEY,
  PAIR,
  DCA_DURATION_IN_MS,
  DCA_BUDGET,
  BASE_SYMBOL,
  QUOTE_SYMBOL,
} from "./constants";
import db from "./db";

const exchangeClass = ccxt[EXCHANGE_ID as keyof typeof ccxt] as typeof Exchange;

export const exchange = new exchangeClass({
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
  console.log("Selected trading pair: ", PAIR);

  let isInsufficientFunds = false;

  // required for formatting numbers
  const markets = await exchange.fetchMarkets();
  const market = markets.find((el) => el.symbol === PAIR);

  if (!market) {
    throw Error("Pair is not supported");
  }

  // process dna plan
  while (true) {
    // Get current quote price in base currency
    const ticker = await exchange.fetchTicker(PAIR);
    const price = ticker.bid;
    const amount = getMinimumQuoteAmount(exchange, market, price);

    try {
      // place limit order
      const trade = await exchange.createOrder(PAIR, "limit", "buy", amount, price);

      const balance = (await exchange.fetchBalance()) as Balances;

      // TO-DO: fix balance calc if limit order isnt filled
      const baseTotal = Number(balance[BASE_SYMBOL].total);
      const quoteTotal = Number(balance[QUOTE_SYMBOL].total);
      // Calculate when to place next dca order
      const nextOrderInMs = Math.round(DCA_DURATION_IN_MS / (DCA_BUDGET / price / amount));

      tg.sendBuyMessage({
        market,
        price,
        amount,
        baseTotal,
        quoteTotal,
        nextOrderInMs,
      });

      db.insertTrade(trade);

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
