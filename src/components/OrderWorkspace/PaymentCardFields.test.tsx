import { describe, expect, it } from "vitest";
import { detectCardBrand } from "./PaymentCardFields";

describe("detectCardBrand", () => {
  it.each([
    ["4242 4242 4242 4242", "Visa"],
    ["5555 5555 5555 4444", "Mastercard"],
    ["2221 0000 0000 0009", "Mastercard"],
    ["3782 822463 10005", "American Express"],
    ["6011 1111 1111 1117", "Discover"],
  ] as const)("detects %s as %s", (number, brand) => {
    expect(detectCardBrand(number)).toBe(brand);
  });

  it("waits for enough digits before identifying a card", () => {
    expect(detectCardBrand("2")).toBeNull();
    expect(detectCardBrand("1234")).toBeNull();
  });
});
