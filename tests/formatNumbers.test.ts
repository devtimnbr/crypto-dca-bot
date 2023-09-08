import { getDecimals, formatNumberWithPrecision } from "../src/utils";

describe("Number Formatting for Telegram", () => {
  const positiveFloat = 1.234567;
  const integer = 123;
  const smallPositiveFloat = 0.1234567;
  const negativeFloat = -1.234567;

  test("Format integer with precision", () => {
    expect(formatNumberWithPrecision(positiveFloat, 3)).toBe("1.235");
  });

  test("Format float with small precision", () => {
    expect(formatNumberWithPrecision(positiveFloat, 0.001)).toBe("1.235");
  });

  test("Format small float with small precision", () => {
    expect(formatNumberWithPrecision(smallPositiveFloat, 0.001)).toBe("0.123");
  });

  test("Format small float with precision", () => {
    expect(formatNumberWithPrecision(smallPositiveFloat, 3)).toBe("0.123");
  });

  test("Format integer with undefined precision", () => {
    expect(formatNumberWithPrecision(integer, undefined)).toBe("123.00");
  });

  test("Format negative number with precision", () => {
    expect(formatNumberWithPrecision(negativeFloat, 3)).toBe("-1.235");
  });

  test("Format small negative float with precision", () => {
    expect(formatNumberWithPrecision(-0.1234567, 0.001)).toBe("-0.123");
  });

  test("Format number with zero precision", () => {
    expect(formatNumberWithPrecision(5.6789, 0)).toBe("6");
  });

  test("Format very large number with precision", () => {
    expect(formatNumberWithPrecision(1e12, 2)).toBe("1000000000000.00");
  });

  test("Format with precision greater than available decimals", () => {
    expect(formatNumberWithPrecision(3.45, 5)).toBe("3.45000");
  });
});
