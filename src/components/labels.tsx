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

const REC: Record<Recommendation, { text: string; cls: string }> = {
  bid: { text: "Looks like a bid", cls: "text-go border-go/40" },
  review: { text: "Needs a look", cls: "text-hold border-hold/40" },
  no_bid: { text: "Likely pass", cls: "text-stop border-stop/40" },
};

export function RecommendationTag({ value }: { value: Recommendation }) {
  const r = REC[value];
  return <span className={`inline-block rounded border px-2 py-0.5 text-xs font-semibold ${r.cls}`}>{r.text}</span>;
}

const DEC: Record<Decision, string> = { pending: "Undecided", bid: "Bidding", no_bid: "Not bidding" };

export function DecisionText({ value }: { value: Decision }) {
  const cls = value === "bid" ? "text-go" : value === "no_bid" ? "text-ink-soft line-through decoration-1" : "text-ink";
  return <span className={`text-sm font-medium ${cls}`}>{DEC[value]}</span>;
}

export function ScopeChips({ scope }: { scope: string[] }) {
  if (!scope.length) return <span className="text-sm text-ink-soft">Scope not stated</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {scope.map((s) => (
        <span key={s} className="rounded bg-paper px-1.5 py-0.5 text-xs text-ink">
          {s}
        </span>
      ))}
    </span>
  );
}
