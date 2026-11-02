import { beforeAll, describe, expect, it } from "vitest";
import type { localReply as LocalReply } from "./local";

let localReply: typeof LocalReply;
beforeAll(async () => {
  process.env.DEMO_TODAY = "2026-11-02";
  ({ localReply } = await import("./local"));
});

describe("built-in chat responder", () => {
  it("lists what is due this week", () => {
    const r = localReply("What's due this week?");
    expect(r.blocks[0]?.type).toBe("bids");
    expect(r.text).toMatch(/due this week/);
  });

  it("turns a pass request into confirm cards, not changes", () => {
    const r = localReply("Pass on the ones outside our area");
    expect(r.blocks.length).toBeGreaterThan(0);
    expect(r.blocks.every((b) => b.type === "confirm" && b.decision === "no_bid")).toBe(true);
    expect(r.blocks.every((b) => b.type === "confirm" && b.bid.decision === "pending")).toBe(true);
  });

  it("drafts a plans request to the right GC", () => {
    const r = localReply("Draft an email to Pinnacle asking for plans");
    const email = r.blocks.find((b) => b.type === "email");
    expect(email && email.type === "email" && email.subject).toMatch(/^Plans and specs for Guess/);
    expect(r.from).toBe("GC Follow Up");
  });

  it("answers a bid by name", () => {
    const r = localReply("tell me about Gunster");
    expect(r.blocks[0]?.type === "bids" && r.blocks[0].bids[0].projectName).toMatch(/Gunster/);
  });

  it("asks which bid when an email has no target", () => {
    expect(localReply("draft an email").blocks).toHaveLength(0);
  });
});
