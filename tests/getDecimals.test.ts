import { getDecimals } from "../src/utils";

describe("getDecimals Function", () => {
  test("Get decimals from a positive float", () => {
    expect(getDecimals(1.234567)).toBe(6); // The number has 6 decimal places.
  });

  test("Get decimals from an integer", () => {
    expect(getDecimals(123)).toBe(0); // An integer has 0 decimal places.
  });

  test("Get decimals from a small positive float", () => {
    expect(getDecimals(0.001)).toBe(3); // The number has 3 decimal places.
  });

  test("Get decimals from a negative float", () => {
    expect(getDecimals(-1234.567)).toBe(3); // The number has 3 decimal places.
  });

  test("Get decimals from a string representing a float", () => {
    expect(getDecimals(3.45)).toBe(2); // The number has 2 decimal places.
  });

  test("Get decimals from a string representing an integer", () => {
    expect(getDecimals(100)).toBe(0); // An integer has 0 decimal places.
  });

  test("Get decimals from zero", () => {
    expect(getDecimals(0)).toBe(0); // Zero has 0 decimal places.
  });

  test("Get decimals from a negative integer", () => {
    expect(getDecimals(-5)).toBe(0); // A negative integer has 0 decimal places.
  });
});
