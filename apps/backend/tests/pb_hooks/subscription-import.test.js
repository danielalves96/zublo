const subscriptionImport = require("../../pb_hooks/lib/pure/subscription-import.js");

describe("pb_hooks/lib/pure/subscription-import.js", () => {
  it("detects Wallos rows by exported field names", () => {
    expect(subscriptionImport.detectWallosFormat({ Name: "Netflix" })).toBe(true);
    expect(subscriptionImport.detectWallosFormat({ "Payment Cycle": "Monthly" })).toBe(true);
    expect(subscriptionImport.detectWallosFormat({ name: "Netflix" })).toBe(false);
  });

  it("parses direct and interval-based payment cycles", () => {
    expect(subscriptionImport.parseCycleAndFrequency("")).toEqual({
      cycleName: "Monthly",
      frequency: 1,
    });
    expect(subscriptionImport.parseCycleAndFrequency("Monthly")).toEqual({
      cycleName: "Monthly",
      frequency: 1,
    });
    expect(subscriptionImport.parseCycleAndFrequency("Every 3 Months")).toEqual({
      cycleName: "Monthly",
      frequency: 3,
    });
    expect(subscriptionImport.parseCycleAndFrequency("Every 2 weeks")).toEqual({
      cycleName: "Weekly",
      frequency: 2,
    });
    expect(subscriptionImport.parseCycleAndFrequency("unknown")).toEqual({
      cycleName: "Monthly",
      frequency: 1,
    });
  });

  it("parses Wallos price strings with symbols and comma decimals", () => {
    expect(subscriptionImport.parseWallosPrice("€9,99")).toEqual({ symbol: "€", price: 9.99 });
    expect(subscriptionImport.parseWallosPrice("R$29.90")).toEqual({ symbol: "R$", price: 29.9 });
    expect(subscriptionImport.parseWallosPrice("12.5")).toEqual({ symbol: "", price: 12.5 });
    expect(subscriptionImport.parseWallosPrice("free")).toEqual({ symbol: "", price: 0 });
  });
});
