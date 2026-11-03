import type { BidHolder } from "@/lib/data/store";
import { trade } from "@/lib/data/store";
import type { Bid } from "@/lib/data/store";
import { card, draftEmail, findBid, findGcBids, searchBids, weekSummary, type EmailPurpose } from "./ops";
import type { ChatReply } from "./types";

/**
 * The built-in responder: handles the everyday asks with plain pattern matching, so the chat works
 * before a language model is connected. It never changes a bid; decisions come back as confirm cards.
 */

const has = (s: string, ...words: string[]) => words.some((w) => s.includes(w));
const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;

function emailPurpose(s: string): EmailPurpose {
  if (has(s, "plan", "spec", "drawing", "document")) return "plans";
  if (has(s, "decline", "pass", "not bidding", "no bid", "regret")) return "decline";
  if (has(s, "intent", "we're bidding", "we are bidding", "will bid", "confirm")) return "intent";
  return "followup";
}

export function localReply(ws: BidHolder, message: string): ChatReply {
  const s = message.toLowerCase().replace(/[’']/g, "'");
  const bid = findBid(ws, message);

  // Email drafts: "draft an email to Pinnacle asking for plans"
  if (has(s, "email", "draft", "write", "follow up", "follow-up", "reach out", "message")) {
    const target = bid ?? findGcBids(ws, s)[0];
    if (!target) return { from: "GC Follow Up", text: "Which bid is the email for? Name the project or the GC and I will draft it.", blocks: [] };
    const purpose = emailPurpose(s);
    const d = draftEmail(ws, target, purpose);
    const what = { plans: "asking for plans and specs", intent: "confirming you plan to bid", decline: "passing politely", followup: "following up" }[purpose];
    return {
      from: "GC Follow Up",
      text: `Here is a draft to ${target.contact?.name ?? target.gcName ?? "the GC"} ${what}. Edit it, then open it in your mail to send. Nothing goes out from here.`,
      blocks: [{ type: "email", bid: card(target), ...d }],
    };
  }

  // Decisions: "pass on the Washington jobs", "we're bidding Gunster"
  const wantsPass = has(s, "pass on", "pass the", "no bid", "not bid", "skip", "decline", "mark as pass");
  const wantsBid = !wantsPass && has(s, "bid on", "we're bidding", "we are bidding", "mark as bid", "mark it bid", "go on", "take it", "let's bid", "lets bid");
  if (wantsPass || wantsBid) {
    const decision = wantsPass ? "no_bid" : "bid";
    let targets: Bid[] = [];
    if (has(s, "outside", "out of area", "washington", " wa ", "service area")) targets = searchBids(ws, { outsideServiceArea: true, decision: "pending" });
    else if (has(s, "likely pass", "the passes")) targets = searchBids(ws, { recommendation: "no_bid", decision: "pending" });
    else if (bid) targets = [bid];
    else targets = findGcBids(ws, s).filter((b) => b.decision === "pending");
    if (!targets.length) return { from: "Bid Desk", text: "I could not tell which bid you mean. Name the project, the GC, or say something like \"pass on the ones outside our area\".", blocks: [] };
    return {
      from: "Bid Desk",
      text: `${targets.length === 1 ? "Confirm this call" : `Confirm each of these ${targets.length} calls`} and I will update the board. ${wantsPass ? "Passing" : "Bidding"} does not email the GC; ask me for a draft if you want one.`,
      blocks: targets.map((b) => ({ type: "confirm" as const, bid: card(b), decision, why: b.screen.reasons[0] })),
    };
  }

  // Lists
  const { all, pending, week, urgent } = weekSummary(ws);
  if (has(s, "today", "tomorrow", "this week", "due", "deadline", "coming up", "next")) {
    const days = has(s, "today") ? 0 : has(s, "tomorrow") ? 1 : has(s, "two weeks", "14") ? 14 : 6;
    const list = searchBids(ws, { dueWithinDays: days }).filter((b) => b.decision !== "no_bid");
    const span = days === 0 ? "today" : days === 1 ? "by tomorrow" : days === 14 ? "in the next two weeks" : "this week";
    return {
      from: "Bid Desk",
      text: list.length ? `${plural(list.length, "open bid")} due ${span}. ${urgent.length ? `${plural(urgent.length, "is", "are")} inside your ${3} day minimum and still undecided.` : ""}`.trim() : `Nothing open is due ${span}.`,
      blocks: list.length ? [{ type: "bids", title: `Due ${span}`, bids: list.map(card) }] : [],
    };
  }
  if (has(s, "outside", "service area", "out of area", "washington")) {
    const list = searchBids(ws, { outsideServiceArea: true });
    return { from: "Bid Desk", text: list.length ? `${plural(list.length, "invitation")} outside your service area. Say "pass on the ones outside our area" to clear them.` : "Every invitation with a location is inside your service area.", blocks: list.length ? [{ type: "bids", title: "Outside the service area", bids: list.map(card) }] : [] };
  }
  if (has(s, "waiting", "undecided", "pending", "need a call", "decide")) {
    return { from: "Bid Desk", text: pending.length ? `${plural(pending.length, "bid")} waiting on a call, soonest first.` : "Every bid has a call.", blocks: pending.length ? [{ type: "bids", title: "Waiting on a call", bids: pending.map(card) }] : [] };
  }
  if (has(s, "needs a look", "need a look", "review", "unclear", "missing")) {
    const list = searchBids(ws, { recommendation: "review", decision: "pending" });
    return { from: "Bid Desk", text: list.length ? `${plural(list.length, "bid")} need a look before a call. The first reason is on each row.` : "Nothing is flagged for a closer look.", blocks: list.length ? [{ type: "bids", title: "Need a look", bids: list.map(card) }] : [] };
  }
  if (has(s, "bidding", "we bid", "yes list")) {
    const list = searchBids(ws, { decision: "bid" });
    return { from: "Bid Desk", text: list.length ? `You are bidding ${plural(list.length, "job")}.` : "No bids are marked as bidding yet.", blocks: list.length ? [{ type: "bids", title: "Bidding", bids: list.map(card) }] : [] };
  }

  // A named bid on its own: tell me about it
  if (bid) {
    const c = card(bid);
    const facts = [
      `${bid.projectName}${c.gc ? ` from ${c.gc}` : ""}${bid.location ? `, ${bid.location}` : ""}.`,
      c.due ? `Due ${c.dueWhen.toLowerCase()} (${c.due}).` : "No due date in the invitation.",
      bid.scope.length ? `Scope named: ${bid.scope.join(", ")}.` : `The invitation does not name the ${trade(ws).noun} scope.`,
      `First read: ${bid.screen.reasons.join("; ")}.`,
    ];
    return { from: "Bid Desk", text: facts.join(" "), blocks: [{ type: "bids", title: "This bid", bids: [c] }] };
  }

  // Briefing
  if (has(s, "summary", "brief", "morning", "what's going on", "whats going on", "where are we", "status", "overview", "update")) {
    const busiest = [...week].sort((a, b) => (a.due!.date < b.due!.date ? -1 : 1));
    return {
      from: "Bid Desk",
      text: `${plural(all.length, "invitation")} read. ${plural(pending.length, "is", "are")} waiting on a call and ${plural(week.length, "open bid")} ${week.length === 1 ? "is" : "are"} due this week${urgent.length ? `, ${urgent.length} of them inside your 3 day minimum` : ""}. These are next:`,
      blocks: [{ type: "bids", title: "Next due", bids: busiest.slice(0, 4).map(card) }],
    };
  }

  return {
    from: "Bid Desk",
    text: "I can show what is due, what is waiting on a call, what is outside your area, or the details of any bid by name. I can also set up a bid or pass call for you to confirm, and draft an email to the GC.",
    blocks: [],
  };
}
