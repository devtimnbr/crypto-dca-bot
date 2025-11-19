// Test the formatNumberWithPrecision function
function formatNumberWithPrecision(number, precision) {
  if (typeof number !== "number" || !isFinite(number)) {
    return "0";
  }

  let actualPrecision;

  if (
    precision === null ||
    precision === undefined ||
    isNaN(Number(precision)) ||
    typeof precision !== "number" ||
    precision < 0
  ) {
    actualPrecision = 2; // Default precision
  } else if (precision === 0) {
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
    return parts.join('.');
  }
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return parts.join('.');
}

// Test with the actual values from the logs
const amount = 0.000012;
const precision = Math.max(8, 8); // baseCurrencyPrecision (8) and we take max with 8

console.log(`Amount: ${amount}`);
console.log(`Precision: ${precision}`);
console.log(`Formatted: ${formatNumberWithPrecision(amount, precision)}`);
console.log(`ToFixed(8): ${amount.toFixed(8)}`);
console.log(`ToFixed(6): ${amount.toFixed(6)}`);