import { Exchange, Market } from "ccxt";
import { Config } from "./config";

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
  const str = num.toString();

  // Check if the number is in scientific notation.
  if (str.includes("e-")) {
    const m = str.split("e-")[1];
    return Number(m); // Return 0 for scientific notation numbers.
  }

  // Extract the decimal part from the string.
  const decimalPart = str.split(".")[1];

  // If there's no decimal part or if it's all zeros, return 0.
  if (!decimalPart || /^0+$/.test(decimalPart)) {
    return 0;
  }

  // Count the number of decimal places (including trailing zeros).
  return decimalPart.length;
}

export function formatNumberWithPrecision(number: number, precision: number | undefined): string {
  // Ensure we have a valid number
  if (typeof number !== 'number' || !isFinite(number)) {
    return '0';
  }

  // Handle null/undefined precision or invalid precision
  if (precision === null || precision === undefined || isNaN(Number(precision)) || typeof precision !== 'number') {
    const formatted = number.toFixed(2).replace(/\.?0*$/, "");
    return formatted;
  }

  // Convert to number
  let decimalPlaces = Number(precision);

  // Check if decimalPlaces is a valid finite number
  if (!isFinite(decimalPlaces) || decimalPlaces < 0) {
    decimalPlaces = 2;
  }

  // If it's a small decimal like 0.00001, convert to integer decimal places
  if (decimalPlaces > 0 && decimalPlaces < 1) {
    decimalPlaces = getDecimalsFromFloat(decimalPlaces);
  } else if (decimalPlaces.toString().includes("e-")) {
    decimalPlaces = getDecimalsFromFloat(decimalPlaces);
  }

  // Ensure decimalPlaces is a non-negative integer
  decimalPlaces = Math.max(0, Math.floor(decimalPlaces));

  // Limit decimal places to a reasonable number
  if (decimalPlaces > 20) {
    decimalPlaces = 20;
  }

  // Format the number with the specified precision.
  let formattedNumber = number.toFixed(decimalPlaces);

  // Remove trailing zeros using a regular expression.
  formattedNumber = formattedNumber.replace(/\.?0*$/, "");

  return formattedNumber;
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
