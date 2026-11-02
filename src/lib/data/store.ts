import { allFixtures } from "@/lib/itb/__fixtures__/emails";
import { parseItbEmail, projectKey, type InboundEmail, type ParsedItb } from "@/lib/itb";
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
  /** How many bids the team can price in one week; drives the load card on the dashboard. */
  weeklyCapacity: number;
}

/**
 * Demo store kept in memory, seeded from the real invitations in the fixtures.
 * The Supabase store replaces this once the database is connected; pages only use these functions.
 */
interface State {
  company: Company;
  bids: Bid[];
}

const DEMO_COMPANY: Company = {
  id: "demo",
  name: "Demo Flooring Co.",
  settings: { serviceStates: ["FL"], minLeadDays: 3, requireFlooring: true, preferredGcs: [], blockedGcs: [] },
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
export function ingest(state: State, emails: InboundEmail[]) {
  const parsed = emails
    .flatMap(parseItbEmail)
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
      existing.flooringScope = [...new Set([...existing.flooringScope, ...itb.flooringScope])];
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

const g = globalThis as unknown as { __bidDesk?: State };

function state(): State {
  if (!g.__bidDesk) {
    g.__bidDesk = { company: DEMO_COMPANY, bids: [] };
    ingest(g.__bidDesk, allFixtures);
  }
  return g.__bidDesk;
}

export function getCompany(): Company {
  return state().company;
}

export function listBids(): Bid[] {
  return [...state().bids].sort((a, b) => (a.due?.date ?? "9999").localeCompare(b.due?.date ?? "9999"));
}

export function getBid(id: string): Bid | undefined {
  return state().bids.find((b) => b.id === id);
}

export function decide(id: string, decision: Decision): Bid | undefined {
  const bid = getBid(id);
  if (!bid) return undefined;
  bid.decision = decision;
  bid.decidedAt = new Date().toISOString();
  const label = { bid: "Marked as bidding", no_bid: "Marked as not bidding", pending: "Moved back to undecided" }[decision];
  bid.events.push({ at: bid.decidedAt, kind: "decision", summary: label });
  return bid;
}
