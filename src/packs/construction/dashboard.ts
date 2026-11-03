import type { Bid, Company } from "@/packs/construction/store";
import type { Recommendation } from "@/packs/construction/itb/screen";
import type { Platform } from "@/packs/construction/itb";
import { daysBetween } from "@/packs/construction/itb/dates";

const DAY = 86_400_000;

export const PLATFORM_LABEL: Record<Platform, string> = {
  buildingconnected: "BuildingConnected",
  constructconnect: "ConstructConnect",
  procore: "Procore",
  direct: "Email",
  client_batch: "Job list",
};

export function addDays(iso: string, n: number) {
  return new Date(new Date(iso + "T12:00:00Z").getTime() + n * DAY).toISOString().slice(0, 10);
}

/** 11.04 style, per the house date format. */
export function shortDate(iso: string) {
  const [, m, d] = iso.split("-");
  return `${m}.${d}`;
}

export function weekday(iso: string, style: "short" | "long" = "short") {
  return new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", { weekday: style, timeZone: "UTC" });
}

export type DayStack = { iso: string; counts: Record<Recommendation, number>; total: number };

/** Open bids (not passed) due on each day of the window, split by first read. */
export function dueByDay(bids: Bid[], today: string, span: number): DayStack[] {
  return Array.from({ length: span }, (_, i) => {
    const iso = addDays(today, i);
    const counts: Record<Recommendation, number> = { bid: 0, review: 0, no_bid: 0 };
    for (const b of bids) if (b.decision !== "no_bid" && b.due?.date === iso) counts[b.screen.recommendation]++;
    return { iso, counts, total: counts.bid + counts.review + counts.no_bid };
  });
}

export function receivedWithin(bids: Bid[], today: string, days: number) {
  return bids.filter((b) => {
    const d = daysBetween(b.receivedAt.slice(0, 10), today);
    return d >= 0 && d < days;
  }).length;
}

export function serviceAreaFit(bids: Bid[], company: Company) {
  const states = company.settings.serviceStates;
  const known = bids.filter((b) => b.state);
  const inside = known.filter((b) => !states.length || states.includes(b.state!));
  return { inside: inside.length, known: known.length, unknown: bids.length - known.length };
}

/** Share of each scope item across all invitations; a bid naming two types counts toward both. */
export function scopeMix(bids: Bid[]) {
  const tally = new Map<string, number>();
  let notStated = 0;
  for (const b of bids) {
    if (!b.scope.length) notStated++;
    for (const s of b.scope) tally.set(s, (tally.get(s) ?? 0) + 1);
  }
  const sorted = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 5);
  const restCount = sorted.slice(5).reduce((n, [, c]) => n + c, 0);
  const rows = top.map(([label, count]) => ({ label, count }));
  if (restCount) rows.push({ label: "Other types", count: restCount });
  if (notStated) rows.push({ label: "Not stated", count: notStated });
  const total = rows.reduce((n, r) => n + r.count, 0);
  return { rows: rows.map((r) => ({ ...r, pct: total ? Math.round((r.count / total) * 100) : 0 })), named: bids.length - notStated };
}

/** How much of the window from invitation to bid due has already passed, 0 to 1. */
export function timeUsed(b: Bid, today: string) {
  if (!b.due) return 0;
  const total = daysBetween(b.receivedAt.slice(0, 10), b.due.date);
  if (total <= 0) return 1;
  return Math.min(1, Math.max(0, daysBetween(b.receivedAt.slice(0, 10), today) / total));
}

export function topSenders(bids: Bid[], n: number) {
  const tally = new Map<string, number>();
  for (const b of bids) {
    const name = b.gcName ?? b.requestedBy;
    if (name) tally.set(name, (tally.get(name) ?? 0) + 1);
  }
  return [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([name, count]) => ({ name, count }));
}

export function recentActivity(bids: Bid[], n: number) {
  return bids
    .flatMap((b) => b.events.map((e) => ({ ...e, bid: b })))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, n);
}
