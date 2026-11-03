import { describe, expect, it } from "vitest";
import { routeDetailed } from "@/lib/team/router";
import { construction } from ".";

const to = (t: string) => routeDetailed(t, construction).bot;

describe("router", () => {
  it("routes plain requests", () => {
    expect(to("Draft an RFQ for Immokalee")).toBe("vendor_rfq");
    expect(to("queue the takeoff for Guess")).toBe("takeoff_coordinator");
    expect(to("outline a proposal")).toBe("proposal_builder");
    expect(to("submittal checklist please")).toBe("submittals");
    expect(to("scope snapshot for Gunster")).toBe("scope_analyst");
    expect(to("email Pinnacle for plans")).toBe("gc_follow_up");
    expect(to("remember that we never bid WA")).toBe("chief");
    expect(to("what's due this week")).toBe("bid_desk");
  });

  it("handles wording no single keyword covers", () => {
    expect(to("what would it cost us to do the Guess job")).toBe("proposal_builder");
    expect(to("can you ask the supplier when the carpet ships")).toBe("vendor_rfq");
    expect(to("who won the Gunster job?")).toBe("gc_follow_up");
    expect(to("how many square feet is Immokalee")).toBe("takeoff_coordinator");
    expect(to("email the vendor about lead times")).toBe("vendor_rfq");
    expect(to("are there any addenda on RIMOWA")).toBe("scope_analyst");
    expect(to("give me a quick overview")).toBe("bid_desk");
    expect(to("hello")).toBe("bid_desk");
  });

  it("asks when two bots fit equally", () => {
    const r = routeDetailed("follow up on the RFQ", construction);
    expect([r.bot, r.tie].sort()).toEqual(["gc_follow_up", "vendor_rfq"]);
    expect(routeDetailed("Draft an RFQ for Immokalee", construction).tie).toBeUndefined();
  });
});
