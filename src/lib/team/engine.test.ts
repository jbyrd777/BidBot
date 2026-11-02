import { beforeAll, describe, expect, it } from "vitest";

type Engine = typeof import("./engine");
type Store = typeof import("./store");
type Bids = typeof import("@/lib/data/store");
let engine: Engine, store: Store, bids: Bids;

beforeAll(async () => {
  process.env.DEMO_TODAY = "2026-11-02";
  delete process.env.MODEL_API_KEY;
  engine = await import("./engine");
  store = await import("./store");
  bids = await import("@/lib/data/store");
});

describe("team engine", () => {
  it("routes requests to the bot that owns them", () => {
    expect(engine.route("Draft an RFQ for Immokalee")).toBe("vendor_rfq");
    expect(engine.route("queue the takeoff for Guess")).toBe("takeoff_coordinator");
    expect(engine.route("outline a proposal")).toBe("proposal_builder");
    expect(engine.route("submittal checklist please")).toBe("submittals");
    expect(engine.route("scope snapshot for Gunster")).toBe("scope_analyst");
    expect(engine.route("email Pinnacle for plans")).toBe("gc_follow_up");
    expect(engine.route("remember that we never bid WA")).toBe("chief");
    expect(engine.route("what's due this week")).toBe("bid_desk");
  });

  it("hands off from the main bot and answers in the same thread", async () => {
    const t = await engine.respond("chief", "Scope snapshot for Gunster");
    const last = t.messages.slice(-2);
    expect(last[0].blocks[0]).toMatchObject({ type: "handoff", to: "scope_analyst" });
    expect(last[1].from).toBe("scope_analyst");
    expect(last[1].blocks.some((b) => b.type === "doc")).toBe(true);
  });

  it("queues a change for an OK, and only changes the board once approved", async () => {
    await engine.respond("chief", "Pass on the ones outside our area");
    const open = store.waiting().filter((a) => a.kind === "decide");
    expect(open.length).toBeGreaterThan(0);
    const id = open[0].payload.bidId;
    expect(bids.getBid(id)?.decision).toBe("pending");
    store.resolve(open[0].id, true);
    expect(bids.getBid(id)?.decision).toBe("no_bid");
  });

  it("runs changes on its own when the bot is set to just do it, but never sends", async () => {
    store.setAutonomy("takeoff_coordinator", "auto");
    const before = store.team().tasks.length;
    await engine.respond("takeoff_coordinator", "Queue the takeoff for Immokalee FHA");
    expect(store.team().tasks.length).toBe(before + 1);
    expect(store.execute({ kind: "send_email" } as never)).toMatch(/connected mailbox/);
  });

  it("remembers facts for the whole team", async () => {
    await engine.respond("chief", "Remember that we never bid Washington work");
    expect(store.team().facts.at(-1)?.text).toBe("we never bid Washington work");
  });
});
