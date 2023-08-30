import { Exchange, Market } from "ccxt";
import { DCA_AMOUNT } from "./constants";

// util for logging
export function dhm(ms: number): string {
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const daysms = ms % (24 * 60 * 60 * 1000);
  const hours = Math.floor(daysms / (60 * 60 * 1000));
  const hoursms = ms % (60 * 60 * 1000);
  const minutes = Math.floor(hoursms / (60 * 1000));
  const minutesms = ms % (60 * 1000);
  const sec = Math.floor(minutesms / 1000);
  return days + "d" + hours + "h" + minutes + "m";
}

// prevent TimeoutOverflowWarning
export function sleep(ms: number): Promise<void> {
  return new Promise<void>((resolve) => {
    if (ms <= 0) {
      resolve();
    } else if (ms > 2147483647) {
      setTimeout(() => sleep(ms - 2147483647).then(resolve), 2147483647);
    } else {
      setTimeout(resolve, ms);
    }
  });
}

// get decimals for a string like "0.001" -> 3
export function getDecimals(str: string): number {
  const decimalIndex = str.indexOf(".");
  return decimalIndex === -1 ? 0 : str.length - decimalIndex - 1;
}

// remove leading whitespace for better message readability
export function removeLeadingWhitespace(input: string): string {
  const lines = input.split("\n");
  const trimmedLines = lines.map((line) => line.trimStart());
  return trimmedLines.join("\n");
}

export function getMinimumQuoteAmount(exchange: Exchange, market: Market, price: number): number {
  if (DCA_AMOUNT) {
    console.log("using dca_amount");
    // check for env var
    return Number(DCA_AMOUNT);
  } else if (market?.limits.cost?.min && market.limits.amount?.min && market.precision.amount) {
    // Calculate min amount based on cost constraint in quote currency
    const minFromLimitCostInQuote = market.limits.cost.min;

    // Calculate min amount based on amount constraint in base currency
    const minFromLimitAmountInBase = market.limits.amount.min * price;

    // Ensure the calculated min amount in base currency is not lower than the cost constraint
    const minAmountInBase =
      minFromLimitCostInQuote > minFromLimitAmountInBase ? minFromLimitCostInQuote : minFromLimitAmountInBase;

    // Convert minAmount back to quote currency using precision
    const minAmountInQuote = minAmountInBase / price;

    // Round up the adjusted amount to the precision
    const adjustedAmountCeiled =
      Math.ceil(minAmountInQuote * Math.pow(10, market.precision.amount)) / Math.pow(10, market.precision.amount);

    return exchange.amountToPrecision(market.symbol, adjustedAmountCeiled);
  } else if (market?.limits.amount?.min && !market.limits.cost?.min) {
    // only amount min defined - just return amount min
    return exchange.amountToPrecision(market.symbol, market.limits.amount.min);
  } else {
    console.log("The exchange did not provide the required data. Maybe set the DCA_AMOUNT env var");
    process.exit();
  }
}

export function printBanner(): void {
  console.log();
  console.log("|===========================================================|");
  console.log("|                     ------------------                    |");
  console.log("|                     | CRYPTO DCA BOT |                    |");
  console.log("|                     ------------------                    |");
  console.log("|                        by @devtimnbr                      |");
  console.log("|                                                           |");
  console.log("|===========================================================|");
  console.log();
}
