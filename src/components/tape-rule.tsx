import Link from "next/link";
import type { Bid } from "@/lib/data/store";
import { daysBetween } from "@/lib/itb/dates";

const SPAN = 21;

/** The next three weeks laid out like a tape measure, with each open bid marked on the day it is due. */
export function TapeRule({ bids, today }: { bids: Bid[]; today: string }) {
  const start = new Date(today + "T12:00:00Z");
  const days = Array.from({ length: SPAN }, (_, i) => {
    const d = new Date(start.getTime() + i * 86_400_000);
    return { i, iso: d.toISOString().slice(0, 10), dow: d.getUTCDay(), label: d.getUTCDate() };
  });
  const byDay = new Map<number, Bid[]>();
  for (const b of bids) {
    if (!b.due || b.decision === "no_bid") continue;
    const offset = daysBetween(today, b.due.date);
    if (offset < 0 || offset >= SPAN) continue;
    byDay.set(offset, [...(byDay.get(offset) ?? []), b]);
  }
  const later = bids.filter((b) => b.due && b.decision !== "no_bid" && daysBetween(today, b.due.date) >= SPAN).length;
  const month = start.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });

  return (
    <figure className="rounded-md border border-rule bg-panel px-4 pt-4 pb-3">
      <figcaption className="flex items-baseline justify-between text-sm text-ink-soft">
        <span>Due in the next three weeks, starting {month} {start.getUTCDate()}</span>
        {later > 0 && <span>{later} more due after that</span>}
      </figcaption>
      <div className="mt-3 overflow-x-auto">
        <ol className="relative grid min-w-[620px]" style={{ gridTemplateColumns: `repeat(${SPAN}, minmax(0, 1fr))` }}>
          {days.map((d) => {
            const due = byDay.get(d.i) ?? [];
            const monday = d.dow === 1;
            const weekend = d.dow === 0 || d.dow === 6;
            return (
              <li key={d.iso} className="flex flex-col">
                <div className={`relative flex h-24 flex-col-reverse items-center gap-1 border-b-2 border-ink pb-2 ${weekend ? "bg-paper/60" : ""}`}>
                  {due.map((b, k) => (
                    <Link
                      key={b.id}
                      href={`/bids/${b.id}`}
                      title={`${b.projectName}, due ${d.iso}`}
                      className="tick-in block h-3 w-[70%] origin-bottom rounded-sm bg-chalk hover:bg-plan"
                      style={{ animationDelay: `${(d.i + k) * 25}ms` }}
                    >
                      <span className="sr-only">{b.projectName}</span>
                    </Link>
                  ))}
                  <span
                    aria-hidden
                    className={`absolute bottom-0 left-0 w-px bg-ink ${monday ? "h-7" : weekend ? "h-2 opacity-40" : "h-4"}`}
                  />
                </div>
                <span className={`pt-1.5 pl-1 text-[11px] leading-none ${d.i === 0 ? "font-bold text-ink" : monday ? "text-ink" : "text-ink-soft"}`}>
                  {d.i === 0 ? (
                    <>
                      <span className="hidden lg:inline">Today</span>
                      <span className="lg:hidden" aria-label="Today">{d.label}</span>
                    </>
                  ) : (
                    d.label
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </figure>
  );
}
