import { allFixtures } from "@/lib/itb/__fixtures__/emails";
import { parseItbEmail, projectKey, type InboundEmail, type ParsedItb } from "@/lib/itb";
import { withTrade } from "@/lib/itb/scope";
import { tradeProfile } from "@/lib/trades";
import { screenItb, type ScreenResult, type ScreenSettings } from "@/lib/itb/screen";

export type Decision = "pending" | "bid" | "no_bid";

export interface BidEvent {
  at: string;
  kind: "invite" | "update" | "reminder" | "decision";
  summary: string;
}

export interface Bid extends ParsedItb {
  id: string;
  screen: ScreenResult;
  decision: Decision;
  decidedAt?: string;
  events: BidEvent[];
}

export interface Company {
  id: string;
  name: string;
  settings: ScreenSettings;
  /** Trade profile key; drives scope reading and wording everywhere. */
  trade: string;
  /** How many bids the team can price in one week; drives the load card on the dashboard. */
  weeklyCapacity: number;
}


const DEMO_COMPANY: Company = {
  id: "demo",
  name: "Demo Flooring Co.",
  settings: { serviceStates: ["FL"], minLeadDays: 3, requireTradeMention: true, preferredGcs: [], blockedGcs: [], trade: "flooring" },
  trade: "flooring",
  weeklyCapacity: 8,
};

export function today(): string {
  return process.env.DEMO_TODAY ?? new Date().toISOString().slice(0, 10);
}

function slug(itb: ParsedItb): string {
  return (projectKey(itb.projectName) + (itb.externalRef ? " " + itb.externalRef : ""))
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function eventFor(itb: ParsedItb): BidEvent {
  const via = { buildingconnected: "BuildingConnected", constructconnect: "ConstructConnect", procore: "Procore", direct: "email", client_batch: "client job list" }[itb.platform];
  const who = itb.forwardedBy ? `, forwarded by ${itb.forwardedBy}` : "";
  const summary =
    itb.kind === "update"
      ? itb.updateSummary ?? "Update from the GC"
      : itb.kind === "reminder"
        ? `Reminder from ${itb.gcName ?? "the GC"}`
        : `Invitation from ${itb.gcName ?? itb.requestedBy ?? "unknown sender"} via ${via}${who}`;
  return { at: itb.receivedAt, kind: itb.kind === "batch_item" ? "invite" : itb.kind, summary };
}

/** Add parsed invitations to the board, folding updates and reminders into the bid they belong to. */
export function ingest(state: BidHolder, emails: InboundEmail[]) {
  const parsed = withTrade(state.company.trade, () => emails.flatMap(parseItbEmail))
    .sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));

  for (const itb of parsed) {
    const key = projectKey(itb.projectName);
    const existing = state.bids.find(
      (b) => (itb.externalRef && b.externalRef === itb.externalRef) || projectKey(b.projectName) === key,
    );

    if (existing && itb.kind !== "invite" && itb.kind !== "batch_item") {
      // Newer dates win; everything else fills gaps only.
      if (itb.due) existing.due = itb.due;
      if (itb.jobWalk) existing.jobWalk = itb.jobWalk;
      if (itb.rfiDue) existing.rfiDue = itb.rfiDue;
      existing.scope = [...new Set([...existing.scope, ...itb.scope])];
      existing.events.push(eventFor(itb));
      existing.screen = screenItb(existing, state.company.settings, today());
      continue;
    }
    if (existing) continue;

    state.bids.push({
      ...itb,
      id: slug(itb),
      screen: screenItb(itb, state.company.settings, today()),
      decision: "pending",
      events: [eventFor(itb)],
    });
  }
}

/** Anything that holds a company and its bids: a demo state or a signed in workspace. */
export interface BidHolder {
  company: Company;
  bids: Bid[];
  /** Changes waiting to be saved; see lib/workspace. */
  changes?: { table: string; op: string; row: unknown }[];
}

/** The demo company, seeded from the sample invitations. Used when no database is configured, and by tests. */
export function demoBids(): BidHolder {
  const s: BidHolder = { company: structuredClone(DEMO_COMPANY), bids: [] };
  ingest(s, allFixtures);
  return s;
}

/** Load the sample invitations into a workspace, for trials and demos. */
export function loadSamples(ws: BidHolder) {
  const before = new Set(ws.bids.map((b) => b.id));
  ingest(ws, allFixtures);
  for (const b of ws.bids) if (!before.has(b.id)) ws.changes?.push({ table: "bids", op: "upsert", row: b });
}

export function getCompany(ws: BidHolder): Company {
  return ws.company;
}

/** The company's trade profile, for wording and scope rules. */
export function trade(ws: BidHolder) {
  return tradeProfile(ws.company.trade);
}

export function listBids(ws: BidHolder): Bid[] {
  return [...ws.bids].sort((a, b) => (a.due?.date ?? "9999").localeCompare(b.due?.date ?? "9999"));
}

export function getBid(ws: BidHolder, id: string): Bid | undefined {
  return ws.bids.find((b) => b.id === id);
}

export function decide(ws: BidHolder, id: string, decision: Decision): Bid | undefined {
  const bid = getBid(ws, id);
  if (!bid) return undefined;
  bid.decision = decision;
  bid.decidedAt = new Date().toISOString();
  const label = { bid: "Marked as bidding", no_bid: "Marked as not bidding", pending: "Moved back to undecided" }[decision];
  bid.events.push({ at: bid.decidedAt, kind: "decision", summary: label });
  ws.changes?.push({ table: "bids", op: "upsert", row: bid });
  return bid;
}

/** Screen every bid again after the trade or the rules change. Calls already made are kept. */
export function rescreen(ws: BidHolder) {
  for (const b of ws.bids) {
    b.screen = screenItb(b, ws.company.settings, today());
    ws.changes?.push({ table: "bids", op: "upsert", row: b });
  }
}
