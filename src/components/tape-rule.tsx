import Link from "next/link";
import type { Bid } from "@/lib/data/store";
import type { Recommendation } from "@/lib/itb/screen";
import { daysBetween } from "@/lib/itb/dates";
import { REC_STYLE } from "./labels";

const SPAN = 21;
const ORDER: Recommendation[] = ["bid", "review", "no_bid"];

/** The next three weeks as columns, one block per open bid on the day it is due, colored by Bid Desk's read. */
export function TapeRule({ bids, today }: { bids: Bid[]; today: string }) {
  const start = new Date(today + "T12:00:00Z");
  const days = Array.from({ length: SPAN }, (_, i) => {
    const d = new Date(start.getTime() + i * 86_400_000);
    return {
      i,
      iso: d.toISOString().slice(0, 10),
      dow: d.getUTCDay(),
      label: d.getUTCDate(),
      weekday: d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
    };
  });
  const open = bids.filter((b) => b.due && b.decision !== "no_bid");
  const byDay = new Map<number, Bid[]>();
  for (const b of open) {
    const offset = daysBetween(today, b.due!.date);
    if (offset < 0 || offset >= SPAN) continue;
    const list = [...(byDay.get(offset) ?? []), b];
    list.sort((x, y) => ORDER.indexOf(x.screen.recommendation) - ORDER.indexOf(y.screen.recommendation));
    byDay.set(offset, list);
  }
  const busiest = Math.max(4, ...[...byDay.values()].map((l) => l.length));
  const inWindow = [...byDay.values()].reduce((n, l) => n + l.length, 0);

  return (
    <figure className="card p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <figcaption className="text-sm font-medium text-ink-soft">Due in the next three weeks</figcaption>
          <p className="mt-1 text-4xl font-bold tracking-tight">{inWindow} <span className="text-lg font-semibold text-ink-soft">open bids</span></p>
        </div>
        <ul className="flex flex-wrap gap-4 text-xs font-medium text-ink-soft">
          {ORDER.map((r) => (
            <li key={r} className="flex items-center gap-1.5">
              <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${REC_STYLE[r].dot}`} />
              {REC_STYLE[r].text}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 overflow-x-auto">
        <ol className="grid min-w-[640px] gap-1.5" style={{ gridTemplateColumns: `repeat(${SPAN}, minmax(0, 1fr))` }}>
          {days.map((d) => {
            const due = byDay.get(d.i) ?? [];
            const weekend = d.dow === 0 || d.dow === 6;
            return (
              <li key={d.iso} className="flex flex-col items-stretch">
                <div className={`flex h-40 flex-col-reverse gap-1 rounded-lg p-1 ${weekend ? "bg-sunk/50" : "bg-sunk"}`}>
                  {due.map((b, k) => (
                    <Link
                      key={b.id}
                      href={`/bids/${b.id}`}
                      title={`${b.projectName}, ${REC_STYLE[b.screen.recommendation].text.toLowerCase()}`}
                      className={`tick-in block origin-bottom rounded-md ${REC_STYLE[b.screen.recommendation].bar} hover:brightness-90`}
                      style={{ height: `calc((100% - ${(busiest - 1) * 4}px) / ${busiest})`, animationDelay: `${(d.i + k) * 22}ms` }}
                    >
                      <span className="sr-only">{b.projectName}</span>
                    </Link>
                  ))}
                </div>
                <span className={`mt-2 text-center text-[11px] leading-tight ${d.i === 0 ? "font-bold text-ink" : "text-ink-soft"}`}>
                  <span className="block">{d.i === 0 ? "Today" : d.weekday}</span>
                  <span className="block">{d.label}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </figure>
  );
}
