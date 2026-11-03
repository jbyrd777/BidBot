import type { SkillResult } from "@/lib/team/pack";
import { getBot } from "@/lib/team/store";
import type { BotId, Block } from "@/lib/team/types";
import { localReply } from "./agent/local";
import { findBid, findGcBids } from "./agent/ops";
import { decisionCard, draftProposal, draftRfq, gcEmail, requestTakeoff, scopeSnapshot, submittalChecklist } from "./skills";
import { listBids, type Bid, type ConstructionWs } from "./store";

const has = (s: string, ...w: string[]) => w.some((x) => s.includes(x));

function targetBid(ws: ConstructionWs, text: string): Bid | undefined {
  return findBid(ws, text) ?? findGcBids(ws, text.toLowerCase())[0];
}

function ask(what: string): SkillResult {
  return { text: `Which bid is this for? Name the project or the GC and I will ${what}.`, blocks: [] };
}

/** Built in handling for each specialist, used until a language model is connected. */
export function reply(ws: ConstructionWs, bot: BotId, text: string, threadBot: BotId): SkillResult {
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
