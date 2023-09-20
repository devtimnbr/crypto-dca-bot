import { Exchange, Market } from "ccxt";
import { DCA_AMOUNT } from "./constants";

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
  let decimalPlaces = precision == undefined ? 2 : precision;

  if ((decimalPlaces >= 0 && decimalPlaces < 1) || decimalPlaces.toString().includes("e-")) {
    // Get the count of non-zero decimal places without removing trailing zeros.
    decimalPlaces = getDecimalsFromFloat(decimalPlaces);
  }
  // TO-DO fix decimal places spaghetti
  // Format the number with the specified precision.
  let formattedNumber = number.toFixed(decimalPlaces);

  // Remove trailing zeros using a regular expression.
  formattedNumber = formattedNumber.replace(/\.?0*$/, "");

  return formattedNumber;
}

export function getMinimumQuoteAmount(exchange: Exchange, market: Market, price: number): number {
  if (DCA_AMOUNT && DCA_AMOUNT > 0) {
    // If DCA_AMOUNT is defined, use it as the quote amount
    return DCA_AMOUNT;
  } else if (market?.limits.amount?.min && !market.limits.cost?.min) {
    // If only minimum amount limit is defined, return the minimum amount
    return exchange.amountToPrecision(market.symbol, market.limits.amount.min);
  } else if (market?.limits.cost?.min && market.limits.amount?.min && market.precision.amount) {
    // Calculate the minimum amount based on market limits
    const minLimitBaseAmount = market.limits.cost.min;
    const minLimitBaseAmountFromQuote = market.limits.amount.min * price;

    // Ensure the calculated min amount in base currency is not lower than the cost constraint
    const minBaseAmount =
      minLimitBaseAmount > minLimitBaseAmountFromQuote ? minLimitBaseAmount : minLimitBaseAmountFromQuote;

    // Convert minAmount back to quote currency using precision
    const minQuoteAmount = minBaseAmount / price;

    // Round up the adjusted amount to the precision
    const decimals =
      market.precision.amount >= 1 ? market.precision.amount : getDecimalsFromFloat(market.precision.amount);
    const minQuoteAmountCeiled = Math.ceil(minQuoteAmount * Math.pow(10, decimals)) / Math.pow(10, decimals);

    return exchange.amountToPrecision(market.symbol, minQuoteAmountCeiled);
  } else {
    // If none of the conditions are met, throw an error and exit
    throw new Error("The exchange did not provide the required data. Maybe set the DCA_AMOUNT env var");
  }
}
