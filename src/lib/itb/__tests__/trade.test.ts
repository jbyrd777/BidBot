import { describe, expect, it } from "vitest";
import { tradeScope, withTrade } from "../scope";

describe("trade profiles", () => {
  const text = "Scope includes LVT, carpet tile, new panelboards, LED lighting fixtures and branch circuit conduit.";
  it("reads scope through the company's trade", () => {
    expect(withTrade("flooring", () => tradeScope(text))).toEqual(["Carpet tile", "LVT"]);
    expect(withTrade("electrical", () => tradeScope(text))).toEqual(["Service and distribution", "Branch wiring", "Lighting"]);
  });
});
