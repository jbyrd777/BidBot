import { daysBetween } from "./dates";
import type { ParsedItb } from "./types";
import { tradeProfile } from "@/lib/trades";

export interface ScreenSettings {
  serviceStates: string[];
  minLeadDays: number;
  requireTradeMention: boolean;
  /** Trade profile key; see lib/trades. */
  trade?: string;
  preferredGcs: string[];
  blockedGcs: string[];
}

export type Recommendation = "bid" | "review" | "no_bid";

export interface ScreenResult {
  recommendation: Recommendation;
  reasons: string[];
}

const same = (a?: string, b?: string) => !!a && !!b && a.toLowerCase().includes(b.toLowerCase());

/**
 * Bid Desk's first pass on an invitation. It recommends; a person decides.
 * Hard stops make it "no_bid", missing facts make it "review", a clean pass is "bid".
 */
export function screenItb(itb: ParsedItb, settings: ScreenSettings, today: string): ScreenResult {
  const stops: string[] = [];
  const gaps: string[] = [];
  const goods: string[] = [];

  if (settings.blockedGcs.some((g) => same(itb.gcName, g))) stops.push(`${itb.gcName} is on the do not bid list`);
  if (settings.preferredGcs.some((g) => same(itb.gcName, g))) goods.push(`${itb.gcName} is a preferred GC`);

  if (!itb.state) gaps.push("Project location not found");
  else if (settings.serviceStates.length && !settings.serviceStates.includes(itb.state)) {
    stops.push(`${itb.state} is outside the service area (${settings.serviceStates.join(", ")})`);
  } else goods.push(`In the service area (${itb.state})`);

  if (!itb.due) gaps.push("No bid due date found");
  else {
    const days = daysBetween(today, itb.due.date);
    if (days < 0) stops.push(`Bid was due ${-days} day${days === -1 ? "" : "s"} ago`);
    else if (days < settings.minLeadDays) gaps.push(`Due in ${days} day${days === 1 ? "" : "s"}, under the ${settings.minLeadDays} day minimum`);
    else goods.push(`Due in ${days} days`);
  }

  if (settings.requireTradeMention) {
    const pkg = [itb.packageName, ...itb.trades].filter(Boolean).join(" ");
    if (itb.scope.length) goods.push(`${tradeProfile(settings.trade).name} scope: ${itb.scope.join(", ")}`);
    else if (tradeProfile(settings.trade).mention.test(pkg)) goods.push(`Invited to the ${itb.packageName ?? tradeProfile(settings.trade).noun} package; scope to confirm in the plans`);
    else if (itb.kind === "batch_item") goods.push("Sent in a job list; confirm scope in the plans");
    else gaps.push(`${tradeProfile(settings.trade).name} scope not confirmed in the invitation`);
  }

  if (stops.length) return { recommendation: "no_bid", reasons: [...stops, ...gaps] };
  if (gaps.length) return { recommendation: "review", reasons: [...gaps, ...goods] };
  return { recommendation: "bid", reasons: goods };
}
