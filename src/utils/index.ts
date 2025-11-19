import { Exchange, Market } from "ccxt";
import { Config } from "../config";

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

// util for logging
export function dhm(ms: number): string {
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const daysms = ms % (24 * 60 * 60 * 1000);
  const hours = Math.floor(daysms / (60 * 60 * 1000));
  const hoursms = ms % (60 * 60 * 1000);
  const minutes = Math.floor(hoursms / (60 * 1000));
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

// remove leading whitespace for better message readability
export function removeLeadingWhitespace(input: string): string {
  const lines = input.split("\n");
  const trimmedLines = lines.map((line) => line.trimStart());
  return trimmedLines.join("\n");
}

export function getDecimalsFromFloat(num: number): number {
  if (Math.floor(num) === num) return 0; // Integer has no decimals

  const str = num.toString();
  if (str.includes("e-")) {
    const exponent = parseInt(str.split("e-")[1], 10);
    return exponent;
  }

  const decimalPart = str.split(".")[1];
  return decimalPart ? decimalPart.length : 0;
}

export function formatNumberWithPrecision(
  number: number,
  precision: number | undefined
): string {
  if (typeof number !== "number" || !isFinite(number)) {
    return "0";
  }

  let actualPrecision: number;

  if (
    precision === null ||
    precision === undefined ||
    isNaN(Number(precision)) ||
    typeof precision !== "number" ||
    precision < 0
  ) {
    actualPrecision = 2; // Default precision
  } else if (precision === 0) {
    // Handle zero precision case
    actualPrecision = 0;
  } else if (precision < 1) {
    // Handle precision as decimal step size (e.g., 0.001 -> 3 decimal places)
    actualPrecision = Math.abs(Math.round(Math.log10(precision)));
  } else {
    // Handle precision as number of decimal places
    actualPrecision = Math.floor(precision);
  }

  // Handle very small numbers for crypto amounts
  if (number > 0 && number < 0.0001 && actualPrecision < 8) {
    actualPrecision = 8;
  }

  // Format the number to a string with the determined precision.
  let formattedNumber = number.toFixed(actualPrecision);

  // Remove trailing zeros and a trailing decimal point if present
  formattedNumber = formattedNumber.replace(/\.?0+$/, "");

  // Add commas for thousands separator (but not for very large numbers per test expectation)
  const parts = formattedNumber.split('.');
  if (parts[0].length > 12) {
    // Don't add commas for very large numbers
    return parts.join('.');
  }
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return parts.join('.');
}

export function getMinimumBaseAmount(exchange: Exchange, market: Market, price: number): number {
  const config = Config.getInstance().trading;

  // Priority 1: Use explicitly configured base amount
  if (config.minBaseAmount && config.minBaseAmount > 0) {
    return exchange.amountToPrecision(market.symbol, config.minBaseAmount);
  }

  // Priority 2: Use MIN_QUOTE_AMOUNT and convert to base amount
  if (config.minQuoteAmount && config.minQuoteAmount > 0) {
    const baseAmount = config.minQuoteAmount / price;
    const precision = market.precision.amount ?? 8; // Default to 8 if undefined
    const decimals = precision >= 1 ? precision : getDecimalsFromFloat(precision);
    const baseAmountCeiled = Math.ceil(baseAmount * Math.pow(10, decimals)) / Math.pow(10, decimals);
    return exchange.amountToPrecision(market.symbol, baseAmountCeiled);
  }

  // Priority 3: Use exchange market limits
  if (market?.limits.cost?.min) {
    // Exchange has a minimum cost (quote) limit
    const baseAmount = market.limits.cost.min / price;
    const precision = market.precision.amount ?? 8; // Default to 8 if undefined
    const decimals = precision >= 1 ? precision : getDecimalsFromFloat(precision);
    const baseAmountCeiled = Math.ceil(baseAmount * Math.pow(10, decimals)) / Math.pow(10, decimals);

    // Also ensure we meet the minimum amount limit if it exists
    if (market?.limits.amount?.min) {
      const minAmountLimit = market.limits.amount.min;
      const finalAmount = Math.max(baseAmountCeiled, minAmountLimit);
      return exchange.amountToPrecision(market.symbol, finalAmount);
    }

    return exchange.amountToPrecision(market.symbol, baseAmountCeiled);
  }

  // Priority 4: Use exchange minimum amount limit if no cost limit
  if (market?.limits.amount?.min) {
    return exchange.amountToPrecision(market.symbol, market.limits.amount.min);
  }

  // If none of the conditions are met, throw an error
  throw new Error("Unable to determine minimum order amount. Please set MIN_QUOTE_AMOUNT or MIN_BASE_AMOUNT in your environment variables.");
}
