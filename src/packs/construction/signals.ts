import { w } from "@/lib/team/router";
import type { Signals } from "@/lib/team/pack";
import type { BotKind } from "./roster";

/** What points a request at each specialist when no language model is connected. */
export const SIGNALS: Record<BotKind, Signals> = {
  bid_desk: [
    ...w(3, "itb", "invitation", "no bid", "service area", "bid or pass", "pass on", "undecided", "bid board"),
    ...w(2, "due", "deadline", "pass", "bidding", "waiting on a call", "summary", "brief", "overview", "what's new", "whats new", "outside our area", "outside the area", "board"),
    ...w(1, "this week", "today", "tomorrow", "new", "bids?\\b"),
  ],
  scope_analyst: [...w(4, "download (the )?plans", "pull (the )?plans", "get (the )?plans", "grab (the )?plans", "fetch (the )?plans", "plan set"), ...w(3, "scope", "spec", "finish schedule", "go or no go", "addend"), ...w(2, "what's in", "whats in", "drawings?", "risks?"), ...w(1, "plans?")],
  takeoff_coordinator: [...w(4, "takeoff", "take off"), ...w(3, "quantit", "measur", "square (feet|foot|yards?)"), ...w(2, "estimator", "how many", "how big", "\\bsf\\b", "sy\\b"), ...w(1, "plans?")],
  vendor_rfq: [...w(4, "rfq"), ...w(3, "vendor", "distributor", "supplier", "lead times?", "manufacturer", "material pric", "ships?\\b", "shipping"), ...w(2, "materials?", "freight", "stock"), ...w(1, "quote")],
  proposal_builder: [...w(4, "proposal"), ...w(3, "inclusion", "exclusion", "alternate", "qualification"), ...w(2, "cost", "price", "pricing", "how much", "bid form", "our number"), ...w(1, "number")],
  gc_follow_up: [
    ...w(3, "follow up", "follow-up", "reach out", "who won", "bid results?", "award(ed)?\\b", "rfi"),
    ...w(2, "email", "write to", "contact", "call the", "text the", "let them know", "tell the gc", "thank"),
    ...w(1, "draft", "gc\\b", "message"),
  ],
  submittals: [...w(4, "submittal"), ...w(3, "data sheet", "product data", "warrant", "cut sheet"), ...w(2, "samples?", "color selection", "after award")],
};
