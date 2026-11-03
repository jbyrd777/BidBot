import { formatDue } from "@/components/labels";
import { getCompany, listBids, today, trade, type Bid, type BidHolder, type Decision } from "@/packs/construction/store";
import { projectKey } from "@/packs/construction/itb";
import { daysBetween } from "@/packs/construction/itb/dates";
import type { Recommendation } from "@/packs/construction/itb/screen";
import type { BidCard } from "./types";

/**
 * The operations the chat may run. Both responders (the built-in one and the model one) go through here,
 * so they read the same data and neither can change a bid: decisions come back as proposals for a person to confirm.
 */

export function card(b: Bid): BidCard {
  const t = today();
  const due = formatDue(b.due, t);
  return {
    id: b.id,
    projectName: b.projectName,
    gc: b.gcName ?? b.requestedBy,
    location: b.location,
    due: b.due ? due.date : undefined,
    dueWhen: due.when,
    late: due.late,
    recommendation: b.screen.recommendation,
    reason: b.screen.reasons[0] ?? "",
    decision: b.decision,
    scope: b.scope,
  };
}

export interface BidQuery {
  decision?: Decision | "all";
  recommendation?: Recommendation;
  dueWithinDays?: number;
  text?: string;
  outsideServiceArea?: boolean;
}

export function searchBids(ws: BidHolder, q: BidQuery): Bid[] {
  const t = today();
  const company = getCompany(ws);
  const text = q.text?.toLowerCase().trim();
  return listBids(ws).filter((b) => {
    if (q.decision && q.decision !== "all" && b.decision !== q.decision) return false;
    if (q.recommendation && b.screen.recommendation !== q.recommendation) return false;
    if (q.dueWithinDays !== undefined) {
      if (!b.due) return false;
      const d = daysBetween(t, b.due.date);
      if (d < 0 || d > q.dueWithinDays) return false;
    }
    if (q.outsideServiceArea) {
      const states = company.settings.serviceStates;
      if (!b.state || !states.length || states.includes(b.state)) return false;
    }
    if (text && ![b.projectName, b.gcName, b.requestedBy, b.location, b.state].some((f) => f?.toLowerCase().includes(text))) return false;
    return true;
  });
}

const STOP = new Set(["the", "a", "an", "on", "for", "to", "of", "and", "job", "jobs", "bid", "project", "fl", "wa", "inc", "llc", "at", "in"]);

/** Find the bid a person means by name ("the Gunster one", "Raising Cane's"), or nothing if it is not clear. */
export function findBid(ws: BidHolder, text: string): Bid | undefined {
  const words = projectKey(text).split(" ").filter((w) => w.length > 2 && !STOP.has(w));
  if (!words.length) return undefined;
  let best: { bid: Bid; score: number } | undefined;
  for (const b of listBids(ws)) {
    const hay = projectKey([b.projectName, b.gcName, b.requestedBy].filter(Boolean).join(" "));
    const score = words.filter((w) => hay.split(" ").includes(w)).length;
    if (score && (!best || score > best.score)) best = { bid: b, score };
  }
  return best?.bid;
}

export function findGcBids(ws: BidHolder, text: string): Bid[] {
  const lower = text.toLowerCase();
  return listBids(ws).filter((b) => {
    const gc = (b.gcName ?? b.requestedBy ?? "").toLowerCase();
    const first = gc.split(/[ ,]/)[0];
    return first.length > 2 && lower.includes(first);
  });
}

export type EmailPurpose = "plans" | "intent" | "decline" | "followup";

/** A plain draft for the GC. The person edits and sends it from their own mail. */
export function draftEmail(ws: BidHolder, b: Bid, purpose: EmailPurpose) {
  const company = getCompany(ws).name;
  const first = b.contact?.name?.split(" ")[0];
  const hello = first ? `Hi ${first},` : "Hello,";
  const job = b.projectName;
  const due = b.due ? formatDue(b.due, today()).date : undefined;
  const bodies: Record<EmailPurpose, { subject: string; lines: string[] }> = {
    plans: {
      subject: `Plans and specs for ${job}`,
      lines: [
        hello,
        `Thank you for the invitation to bid ${job}. Could you send the plans, the finish schedule and the ${trade(ws).noun} specifications, or a link to the drawings?`,
        due ? `We are working toward the ${due} bid date and want to make sure our number covers the full scope.` : "Please also confirm the bid date when you have a moment.",
        "Thank you,",
        company,
      ],
    },
    intent: {
      subject: `Intent to bid: ${job}`,
      lines: [hello, `${company} plans to submit a ${trade(ws).noun} number for ${job}${due ? ` by ${due}` : ""}.`, "Please keep us on the bidders list for addenda and any questions.", "Thank you,", company],
    },
    decline: {
      subject: `${job}: not bidding this one`,
      lines: [hello, `Thank you for thinking of ${company} for ${job}. We will pass on this one, but we would like to stay on your list for future ${trade(ws).noun} work.`, "Thank you,", company],
    },
    followup: {
      subject: `Following up on ${job}`,
      lines: [hello, `Following up on our ${trade(ws).noun} number for ${job}. Is there anything you need from us, and do you have a sense of timing on the award?`, "Thank you,", company],
    },
  };
  const d = bodies[purpose];
  return { to: b.contact?.email, subject: d.subject, body: d.lines.join("\n\n") };
}

export function weekSummary(ws: BidHolder) {
  const t = today();
  const all = listBids(ws);
  const pending = all.filter((b) => b.decision === "pending");
  const week = all.filter((b) => b.decision !== "no_bid" && b.due && daysBetween(t, b.due.date) >= 0 && daysBetween(t, b.due.date) < 7);
  const urgent = pending.filter((b) => b.due && daysBetween(t, b.due.date) >= 0 && daysBetween(t, b.due.date) < 3);
  return { all, pending, week, urgent };
}
