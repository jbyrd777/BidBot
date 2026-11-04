import type { PackTool } from "@/lib/team/pack";
import type { BotId, Block } from "@/lib/team/types";
import { card, searchBids, type EmailPurpose } from "./agent/ops";
import { decisionCard, draftProposal, draftRfq, fetchPlans, gcEmail, requestTakeoff, scopeSnapshot, submittalChecklist } from "./skills";
import { getBid, type Bid, type ConstructionWs } from "./store";

/** What the language model may do on the construction pack. Each tool belongs to one bot. */

const bidArg = { type: "object", properties: { bid_id: { type: "string" } }, required: ["bid_id"] };

function withBid(fn: (ws: ConstructionWs, b: Bid, a: Record<string, string>, threadBot: BotId) => { text: string; blocks: Block[] }) {
  return (ws: ConstructionWs, a: Record<string, string>, threadBot: BotId, blocks: Block[]) => {
    const b = getBid(ws, a.bid_id);
    if (!b) return "No bid with that id. Call search_bids first.";
    const r = fn(ws, b, a, threadBot);
    blocks.push(...r.blocks);
    return r.text;
  };
}

export const TOOLS: Record<string, PackTool<ConstructionWs>> = {
  search_bids: {
    owner: "bid_desk",
    shared: true,
    description: "List bids on the board. Filters are optional. decision: pending (undecided), bid, no_bid, all. recommendation: bid, review (needs a look), no_bid (likely pass).",
    parameters: {
      type: "object",
      properties: {
        decision: { type: "string", enum: ["pending", "bid", "no_bid", "all"] },
        recommendation: { type: "string", enum: ["bid", "review", "no_bid"] },
        due_within_days: { type: "number" },
        text: { type: "string" },
        outside_service_area: { type: "boolean" },
      },
    },
    run: (ws, a, _t, blocks) => {
      const bids = searchBids(ws, {
        decision: a.decision as never,
        recommendation: a.recommendation as never,
        dueWithinDays: a.due_within_days === undefined ? undefined : Number(a.due_within_days),
        text: a.text,
        outsideServiceArea: a.outside_service_area as unknown as boolean,
      });
      if (bids.length) blocks.push({ type: "bids", title: "Bids", bids: bids.map(card) });
      return JSON.stringify(bids.map((b) => ({ ...card(b), state: b.state })));
    },
  },
  get_bid: {
    owner: "bid_desk",
    shared: true,
    description: "Everything known about one bid: dates, scope, contact, links, description and screening reasons.",
    parameters: bidArg,
    run: (ws, a) => {
      const b = getBid(ws, a.bid_id);
      if (!b) return "No bid with that id.";
      const { events, ...rest } = b;
      return JSON.stringify({ ...rest, history: events.map((e) => `${e.at.slice(0, 10)} ${e.summary}`) });
    },
  },
  propose_decision: {
    owner: "bid_desk",
    shared: true,
    description: "Mark a bid as bidding or not bidding. Shown to the person for an OK unless the bot runs on its own.",
    parameters: { type: "object", properties: { bid_id: { type: "string" }, decision: { type: "string", enum: ["bid", "no_bid"] } }, required: ["bid_id", "decision"] },
    run: withBid((ws, b, a, t) => ({ text: "Queued for the person's OK.", blocks: [decisionCard(ws, b, a.decision as "bid" | "no_bid", t)] })),
  },
  scope_snapshot: { owner: "scope_analyst", description: "Scope snapshot for a bid from what is known so far.", parameters: bidArg, run: withBid((ws, b) => scopeSnapshot(ws, b)) },
  fetch_plans: {
    owner: "scope_analyst",
    description: "Download a bid's plan set, specs and addenda on the company's computer. Shown for an OK unless the bot runs on its own.",
    parameters: bidArg,
    run: withBid((ws, b, _a, t) => fetchPlans(ws, b, t)),
  },
  request_takeoff: { owner: "takeoff_coordinator", description: "Put a takeoff for a bid in the estimating queue.", parameters: bidArg, run: withBid((ws, b, _a, t) => requestTakeoff(ws, b, t)) },
  draft_rfq: { owner: "vendor_rfq", description: "Draft an RFQ to distributors for a bid's scope.", parameters: bidArg, run: withBid((ws, b) => draftRfq(ws, b)) },
  draft_proposal: { owner: "proposal_builder", description: "Outline a proposal for a bid. Never include a price.", parameters: bidArg, run: withBid((ws, b) => draftProposal(ws, b)) },
  submittal_checklist: { owner: "submittals", description: "Submittal checklist for a bid.", parameters: bidArg, run: withBid((ws, b) => submittalChecklist(ws, b)) },
  draft_gc_email: {
    owner: "gc_follow_up",
    description: "Draft an email to the GC on a bid. purpose: plans, intent, decline or followup.",
    parameters: { type: "object", properties: { bid_id: { type: "string" }, purpose: { type: "string", enum: ["plans", "intent", "decline", "followup"] } }, required: ["bid_id", "purpose"] },
    run: withBid((ws, b, a) => gcEmail(ws, b, a.purpose as EmailPurpose)),
  },
};
