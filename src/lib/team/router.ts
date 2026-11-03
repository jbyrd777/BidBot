import type { BotId } from "./types";

/**
 * Picks the bot for a request without a language model. Each bot has weighted signals; the request is
 * scored against all of them, so wording that misses one phrase still lands through the others.
 * When two bots score close together, the main bot asks instead of guessing.
 */

type Signals = [RegExp, number][];

const w = (weight: number, ...words: string[]): [RegExp, number][] => words.map((x) => [new RegExp(`\\b${x}`, "i"), weight]);

const SIGNALS: Record<BotId, Signals> = {
  chief: [...w(3, "remember", "forget", "what do you know", "remind", "todo", "to do list", "what can you", "who are you", "approv", "waiting for (my|your) ok"), ...w(2, "task", "help", "my list"), ...w(1, "team")],
  bid_desk: [
    ...w(3, "itb", "invitation", "no bid", "service area", "bid or pass", "pass on", "undecided", "bid board"),
    ...w(2, "due", "deadline", "pass", "bidding", "waiting on a call", "summary", "brief", "overview", "what's new", "whats new", "outside our area", "outside the area", "board"),
    ...w(1, "this week", "today", "tomorrow", "new", "bids?\\b"),
  ],
  scope_analyst: [...w(3, "scope", "spec", "finish schedule", "go or no go", "addend"), ...w(2, "what's in", "whats in", "drawings?", "risks?"), ...w(1, "plans?")],
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

export interface RouteResult {
  bot: BotId;
  /** Close runner up, when the request could fairly belong to either. */
  tie?: BotId;
  scores: Partial<Record<BotId, number>>;
}

export function routeDetailed(text: string): RouteResult {
  const s = ` ${text.toLowerCase()} `;
  const scores: Partial<Record<BotId, number>> = {};
  for (const [bot, signals] of Object.entries(SIGNALS) as [BotId, Signals][]) {
    const score = signals.reduce((n, [re, weight]) => n + (re.test(s) ? weight : 0), 0);
    if (score) scores[bot] = score;
  }
  const ranked = (Object.entries(scores) as [BotId, number][]).sort((a, b) => b[1] - a[1]);
  if (!ranked.length) return { bot: "bid_desk", scores };
  const [[top, a], second] = ranked;
  // The main bot's own requests (memory, tasks, approvals) win outright; they are about the team, not the work.
  if (top === "chief" && a >= 3) return { bot: "chief", scores };
  const tie = second && second[0] !== "chief" && a >= 3 && second[1] >= 3 && a - second[1] <= 1 ? second[0] : undefined;
  return { bot: top, tie, scores };
}

export function route(text: string): BotId {
  return routeDetailed(text).bot;
}
