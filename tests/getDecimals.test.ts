import { getDecimalsFromFloat } from "../src/utils";

describe("getDecimalsFromFloat Function", () => {
  test("Get decimals from a positive float", () => {
    expect(getDecimalsFromFloat(1.234567)).toBe(6); // The number has 6 decimal places.
  });

  test("Get decimals from an integer", () => {
    expect(getDecimalsFromFloat(123)).toBe(0); // An integer has 0 decimal places.
  });

  test("Get decimals from a small positive float", () => {
    expect(getDecimalsFromFloat(0.001)).toBe(3); // The number has 3 decimal places.
  });

  test("Get decimals from a negative float", () => {
    expect(getDecimalsFromFloat(-1234.567)).toBe(3); // The number has 3 decimal places.
  });

  test("Get decimals from a string representing a float", () => {
    expect(getDecimalsFromFloat(3.45)).toBe(2); // The number has 2 decimal places.
  });

  test("Get decimals from a string representing an integer", () => {
    expect(getDecimalsFromFloat(100)).toBe(0); // An integer has 0 decimal places.
  });

  test("Get decimals from zero", () => {
    expect(getDecimalsFromFloat(0)).toBe(0); // Zero has 0 decimal places.
  });

  test("Get decimals from a negative integer", () => {
    expect(getDecimalsFromFloat(-5)).toBe(0); // A negative integer has 0 decimal places.
  });
});
