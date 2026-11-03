import type { IndustryPack } from "@/lib/team/pack";
import type { ScreenSettings } from "./itb/screen";
import { reply } from "./replies";
import { DEFAULT_ROSTER } from "./roster";
import { SIGNALS } from "./signals";
import { decide, demoBids, getCompany, trade, type Bid, type BidHolder, type Company, type ConstructionWs } from "./store";
import { TOOLS } from "./tools";

type Row = Record<string, unknown>;

/** Commercial subcontractors, any trade: the bid cycle from invitation to submittals. */
export const construction: IndustryPack<ConstructionWs, BidHolder> = {
  key: "construction",
  name: "Commercial subcontractors",
  mainBot: { name: "Foreman", role: "Runs the team. Takes any request, hands it to the right bot and reports back" },
  roster: DEFAULT_ROSTER.map((b) => ({ id: b.kind, name: b.name, role: b.role })),
  signals: SIGNALS,
  fallbackBot: "bid_desk",
  covers: "your bids, scope, takeoffs, vendor pricing, proposals, GC follow up or submittals",

  reply,
  tools: TOOLS,
  about: (ws) => `${getCompany(ws).name}, a commercial ${trade(ws).name.toLowerCase()} subcontractor`,
  rules: (ws) => {
    const c = getCompany(ws);
    return [
      `Service area: ${c.settings.serviceStates.join(", ")}. Minimum lead time: ${c.settings.minLeadDays} days. Weekly capacity: ${c.weeklyCapacity} bids.`,
      "Use the tools for facts about bids; never guess. Keep replies short and plain.",
      "Sales owns price: never suggest a number.",
    ];
  },
  execute: (ws, a) => {
    if (a.kind !== "decide") return undefined;
    const bid = decide(ws, a.payload.bidId, a.payload.decision as "bid" | "no_bid");
    return bid ? `${bid.projectName} marked as ${a.payload.decision === "bid" ? "bidding" : "not bidding"}` : "That bid is no longer on the board";
  },

  demo: demoBids,
  load: async (sb, w) => {
    const settings = { ...(w.settings as ScreenSettings), trade: w.trade as string };
    const company: Company = { id: w.id as string, name: w.name as string, settings, trade: w.trade as string, weeklyCapacity: w.weekly_capacity as number };
    const { data } = await sb.from("bids").select("data, decision, decided_at").eq("workspace_id", w.id as string);
    const bids = ((data ?? []) as Row[]).map((r) => ({ ...(r.data as Bid), decision: r.decision as Bid["decision"], decidedAt: (r.decided_at as string) ?? undefined }));
    return { company, bids };
  },
  save: async (sb, ws, changes, by) => {
    const bids = changes.filter((c) => c.table === "bids").map((c) => c.row as Bid);
    if (!bids.length) return;
    const { error } = await sb.from("bids").upsert(
      bids.map((b) => ({ workspace_id: ws.company.id, id: b.id, data: b, due_date: b.due?.date ?? null, decision: b.decision, decided_at: b.decidedAt ?? null, decided_by: b.decision !== "pending" ? by : null, updated_at: new Date().toISOString() })),
    );
    if (error) throw new Error(`Could not save bids: ${error.message}`);
  },
};
