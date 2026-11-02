import type { Recommendation } from "@/lib/itb/screen";
import type { Decision } from "@/lib/data/store";
import type { DueDate } from "@/lib/itb";
import { daysBetween } from "@/lib/itb/dates";

export function formatDue(due: DueDate | undefined, today: string): { date: string; when: string; late: boolean } {
  if (!due) return { date: "No date", when: "Ask the GC", late: false };
  const d = new Date(due.date + "T12:00:00Z");
  const date = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
  const time = due.time
    ? " " + new Date(`2000-01-01T${due.time}:00Z`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }) + (due.tz ? ` ${due.tz}` : "")
    : "";
  const days = daysBetween(today, due.date);
  const when = days < 0 ? `${-days} day${days === -1 ? "" : "s"} ago` : days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`;
  return { date: date + time, when, late: days < 0 };
}

/**
 * One accent, three fills: a likely bid is solid lime, one that needs a look is a lime outline,
 * a likely pass is gray hatching. Shape and texture carry the meaning, not hue alone.
 */
export const REC_STYLE: Record<Recommendation, { text: string; swatch: string; block: string }> = {
  bid: { text: "Looks like a bid", swatch: "bg-lime", block: "bg-lime" },
  review: { text: "Needs a look", swatch: "border-2 border-lime-deep bg-panel", block: "border-2 border-lime-deep bg-lime-wash" },
  no_bid: { text: "Likely pass", swatch: "hatch border border-rule", block: "hatch" },
};

export function RecommendationTag({ value }: { value: Recommendation }) {
  const r = REC_STYLE[value];
  return (
    <span className="inline-flex items-center gap-2 text-[13px] font-semibold">
      <span aria-hidden className={`h-3 w-3 rounded-[3px] ${r.swatch}`} />
      {r.text}
    </span>
  );
}

const DEC: Record<Decision, string> = { pending: "Undecided", bid: "Bidding", no_bid: "Not bidding" };

export function DecisionText({ value }: { value: Decision }) {
  const cls = value === "bid" ? "bg-lime text-ink" : value === "no_bid" ? "bg-sunk text-ink-soft" : "bg-sunk text-ink";
  return <span className={`inline-block rounded-md px-2 py-1 text-xs font-semibold ${cls}`}>{DEC[value]}</span>;
}

export function ScopeChips({ scope }: { scope: string[] }) {
  if (!scope.length) return <span className="text-xs text-ink-soft">Scope not stated</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {scope.map((s) => (
        <span key={s} className="rounded-md bg-sunk px-1.5 py-0.5 text-[11px] font-medium text-ink">
          {s}
        </span>
      ))}
    </span>
  );
}

/** A squircle with the sender's initials, so a GC is recognizable at a glance in a long list. */
export function GcMark({ name, size = "md" }: { name?: string; size?: "md" | "lg" }) {
  const initials = (name ?? "?")
    .replace(/[^A-Za-z ]/g, "")
    .split(" ")
    .filter((w) => w && !/^(inc|llc|co|company|and|the|of)$/i.test(w))
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const dim = size === "lg" ? "h-12 w-12 rounded-[14px] text-[15px]" : "h-10 w-10 rounded-xl text-[13px]";
  return (
    <span aria-hidden className={`display grid shrink-0 place-items-center bg-sunk font-semibold text-ink ${dim}`}>
      {initials || "?"}
    </span>
  );
}
