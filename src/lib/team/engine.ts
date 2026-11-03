import type { TeamHolder } from "./store";
import { localReply } from "@/lib/agent/local";
import { findBid, findGcBids } from "@/lib/agent/ops";
import { listBids } from "@/lib/data/store";
import type { Bid } from "@/lib/data/store";
import { decisionCard, draftProposal, draftRfq, gcEmail, requestTakeoff, scopeSnapshot, submittalChecklist, change, type SkillResult } from "./skills";
import { botName, getBot, post, remember, team, thread, waiting } from "./store";
import type { BotId, Block } from "./types";
import { modelConfigured, modelTurn } from "./model";

const has = (s: string, ...w: string[]) => w.some((x) => s.includes(x));

/** Which bot should take a request. The main bot keeps anything that is about the team itself. */
export function route(text: string): BotId {
  const s = ` ${text.toLowerCase()} `;
  if (has(s, "remember", "what do you know", "forget ", "remind me", "to do", "todo", "task", "waiting for", "approval", "what can you", "who are you", "help")) return "chief";
  if (has(s, "rfq", "vendor", "distributor", "supplier", "lead time", "material price", "pricing from")) return "vendor_rfq";
  if (has(s, "takeoff", "take off", "quantities", "measure")) return "takeoff_coordinator";
  if (has(s, "proposal", "inclusion", "exclusion", "alternate")) return "proposal_builder";
  if (has(s, "submittal", "data sheet", "warranty", "samples")) return "submittals";
  if (has(s, "scope", " spec", "finish schedule", "plans for", "go or no go")) return "scope_analyst";
  if (has(s, "email", "draft", "follow up", "follow-up", "reach out", "write to", "call the gc", "text the gc")) return "gc_follow_up";
  return "bid_desk";
}

function targetBid(ws: TeamHolder, text: string): Bid | undefined {
  return findBid(ws, text) ?? findGcBids(ws, text.toLowerCase())[0];
}

function ask(what: string): SkillResult {
  return { text: `Which bid is this for? Name the project or the GC and I will ${what}.`, blocks: [] };
}

/** Built in handling for each bot, used until a language model is connected. */
function local(ws: TeamHolder, bot: BotId, text: string, threadBot: BotId): SkillResult {
  const s = text.toLowerCase();
  const bid = targetBid(ws, text);
  switch (bot) {
    case "scope_analyst":
      return bid ? scopeSnapshot(ws, bid) : ask("write the scope snapshot");
    case "takeoff_coordinator":
      return bid ? requestTakeoff(ws, bid, threadBot) : ask("queue the takeoff");
    case "vendor_rfq":
      return bid ? draftRfq(ws, bid) : ask("draft the RFQ");
    case "proposal_builder":
      return bid ? draftProposal(ws, bid) : ask("outline the proposal");
    case "submittals":
      return bid ? submittalChecklist(ws, bid) : ask("build the checklist");
    case "gc_follow_up": {
      if (!bid) return ask("draft it");
      const purpose = has(s, "plan", "spec", "drawing") ? "plans" : has(s, "decline", "pass", "regret") ? "decline" : has(s, "intent", "we're bidding", "we are bidding") ? "intent" : "followup";
      return gcEmail(ws, bid, purpose);
    }
    case "chief":
      return chief(ws, text, threadBot);
    default: {
      const r = localReply(ws, text);
      const blocks: Block[] = r.blocks.map((b) => {
        if (b.type !== "confirm") return b;
        const full = listBids(ws).find((x) => x.id === b.bid.id)!;
        return decisionCard(ws, full, b.decision, threadBot);
      });
      const text2 = r.blocks.some((b) => b.type === "confirm")
        ? getBot(ws, "bid_desk")?.autonomy === "auto"
          ? "Done. I updated the board; each change is listed below."
          : `${blocks.length === 1 ? "This call is" : `These ${blocks.length} calls are`} waiting for your OK. Passing does not email the GC; ask for a draft if you want one.`
        : r.text;
      return { text: text2, blocks };
    }
  }
}

function chief(ws: TeamHolder, text: string, threadBot: BotId): SkillResult {
  const s = text.toLowerCase();
  const m = text.match(/remember(?: that)?\s+(.+)/i);
  if (m) {
    remember(ws, m[1].replace(/[.]$/, ""), "chief");
    return { text: "Got it. Every bot on the team will use that.", blocks: [] };
  }
  if (has(s, "what do you know", "what do you remember")) {
    const facts = team(ws).facts;
    return { text: facts.length ? facts.map((f) => f.text).join("\n") : "Nothing saved yet. Tell me something to remember and every bot will use it.", blocks: [] };
  }
  const r = text.match(/(?:remind me to|add a task to|task:?|todo:?|to do:?)\s+(.+)/i);
  if (r) {
    return { text: "I can add that to your tasks.", blocks: [change(ws, "chief", threadBot, "create_task", `Add a task for you: ${r[1]}`, { title: r[1], owner: team(ws).you.name })] };
  }
  if (has(s, "waiting", "approval")) {
    const w = waiting(ws);
    return { text: w.length ? `${w.length} ${w.length === 1 ? "thing is" : "things are"} waiting for your OK:` : "Nothing is waiting for your OK.", blocks: w.map((a) => ({ type: "approval" as const, approvalId: a.id })) };
  }
  const roster = team(ws).bots.filter((b) => b.id !== "chief").map((b) => b.name).join(", ");
  return {
    text: `I run the team: ${roster}. Ask me anything about your bids, scope, takeoffs, vendor pricing, proposals, GC follow up or submittals and I will hand it to the right bot. I can also remember things for the whole team and keep your task list. Anything that changes data or goes out waits for your OK.`,
    blocks: [],
  };
}

/**
 * One turn of conversation. A message to the main bot is routed to the right specialist, who answers
 * in the same thread; a message in a specialist's own thread goes straight to that bot.
 */
export async function respond(ws: TeamHolder, threadBot: BotId, text: string) {
  const t = thread(ws, threadBot);
  post(ws, t, { from: "user", text, blocks: [] });

  if (modelConfigured()) {
    try {
      const r = await modelTurn(ws, threadBot, t);
      if (r.handoff && threadBot === "chief" && r.from !== "chief") post(ws, t, { from: "chief", text: "", blocks: [{ type: "handoff", to: r.from, note: `Passing this to ${botName(ws, r.from)}` }] });
      post(ws, t, { from: r.from, text: r.text, blocks: r.blocks });
      return t;
    } catch (e) {
      post(ws, t, { from: threadBot, text: "", blocks: [{ type: "notice", tone: "warn", text: `The language model did not answer (${(e as Error).message}). I answered with the built in skills instead.`, href: "/settings", cta: "Check settings" }] });
    }
  }

  const target = threadBot === "chief" ? route(text) : threadBot;
  if (threadBot === "chief" && target !== "chief") post(ws, t, { from: "chief", text: "", blocks: [{ type: "handoff", to: target, note: `Passing this to ${botName(ws, target)}` }] });
  const r = local(ws, target, text, threadBot);
  post(ws, t, { from: target, text: r.text, blocks: r.blocks });
  return t;
}
