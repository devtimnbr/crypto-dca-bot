import { formatNumberWithPrecision } from "../src/utils";

describe("Number Formatting for Telegram", () => {
  test("Format integer with precision", () => {
    expect(formatNumberWithPrecision(1.234567, 3)).toBe("1.235");
  });

  test("Format float with small precision", () => {
    expect(formatNumberWithPrecision(1.234567, 0.001)).toBe("1.235");
  });

  test("Format small float with small precision", () => {
    expect(formatNumberWithPrecision(0.1234567, 0.001)).toBe("0.123");
  });

  test("Format small float with precision", () => {
    expect(formatNumberWithPrecision(0.1234567, 3)).toBe("0.123");
  });

  test("Format integer with undefined precision", () => {
    expect(formatNumberWithPrecision(123, undefined)).toBe("123");
  });

  test("Format number with zero precision", () => {
    expect(formatNumberWithPrecision(5.6789, 0)).toBe("6");
  });

  test("Format very large number with precision", () => {
    expect(formatNumberWithPrecision(1e12, 2)).toBe("1000000000000");
  });

  test("Format number with undefined precision", () => {
    expect(formatNumberWithPrecision(0.256, undefined)).toBe("0.26");
  });

  test("Format number with scientific notation precision", () => {
    expect(formatNumberWithPrecision(0.123456, 1e-8)).toBe("0.123456");
  });

  test("Format number in scientific notation with non-zero precision", () => {
    expect(formatNumberWithPrecision(1e-8, 8)).toBe("0.00000001");
  });
});
