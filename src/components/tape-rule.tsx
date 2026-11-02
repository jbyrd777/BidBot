import Link from "next/link";
import type { Bid } from "@/lib/data/store";
import type { Recommendation } from "@/lib/itb/screen";
import { daysBetween } from "@/lib/itb/dates";
import { REC_STYLE } from "./labels";

const SPAN = 21;
const ORDER: Recommendation[] = ["bid", "review", "no_bid"];

/** The next three weeks as a rail of day columns, one tile per open bid on its due day, today held under the glass lens. */
export function TapeRule({ bids, today }: { bids: Bid[]; today: string }) {
  const start = new Date(today + "T12:00:00Z");
  const days = Array.from({ length: SPAN }, (_, i) => {
    const d = new Date(start.getTime() + i * 86_400_000);
    return {
      i,
      iso: d.toISOString().slice(0, 10),
      dow: d.getUTCDay(),
      label: d.getUTCDate(),
      weekday: d.toLocaleDateString("en-US", { weekday: "narrow", timeZone: "UTC" }),
    };
  });
  const byDay = new Map<number, Bid[]>();
  for (const b of bids) {
    if (!b.due || b.decision === "no_bid") continue;
    const offset = daysBetween(today, b.due.date);
    if (offset < 0 || offset >= SPAN) continue;
    const list = [...(byDay.get(offset) ?? []), b];
    list.sort((x, y) => ORDER.indexOf(x.screen.recommendation) - ORDER.indexOf(y.screen.recommendation));
    byDay.set(offset, list);
  }
  const busiest = Math.max(4, ...[...byDay.values()].map((l) => l.length));
  const inWindow = [...byDay.values()].reduce((n, l) => n + l.length, 0);
  const peak = [...byDay.entries()].sort((a, b) => b[1].length - a[1].length)[0];
  const peakLabel =
    peak && peak[1].length > 1
      ? `, busiest ${new Date(days[peak[0]].iso + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" })} with ${peak[1].length}`
      : "";

  return (
    <figure className="bezel">
      <div className="core p-5 md:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-[19px] font-semibold">Due in the next three weeks</h2>
            <figcaption className="mt-1 text-[13px] text-ink-soft">
              {inWindow} open bids{peakLabel}
            </figcaption>
          </div>
          <ul className="flex flex-wrap gap-4 text-[12px] text-ink-soft">
            {ORDER.map((r) => (
              <li key={r} className="flex items-center gap-2">
                <span aria-hidden className={`h-3 w-3 rounded-[4px] ${REC_STYLE[r].swatch}`} />
                {REC_STYLE[r].text}
              </li>
            ))}
          </ul>
        </div>

        <div className="-mx-2 mt-6 overflow-x-auto px-2 pb-1">
          <ol className="grid min-w-[620px] gap-1.5" style={{ gridTemplateColumns: `repeat(${SPAN}, minmax(0, 1fr))` }}>
            {days.map((d) => {
              const due = byDay.get(d.i) ?? [];
              const weekend = d.dow === 0 || d.dow === 6;
              const isToday = d.i === 0;
              return (
                <li key={d.iso} className="flex flex-col">
                  <span className={`h-5 text-center text-[13px] font-semibold ${due.length ? "text-ink" : "text-transparent"}`}>{due.length || 0}</span>
                  <div
                    className={`mt-1 flex h-36 flex-col-reverse gap-[3px] rounded-[12px] p-[3px] ${
                      isToday ? "lens" : weekend ? "bg-transparent" : "bg-sunk"
                    }`}
                  >
                    {due.map((b, k) => (
                      <Link
                        key={b.id}
                        href={`/bids/${b.id}`}
                        title={`${b.projectName}, ${REC_STYLE[b.screen.recommendation].text.toLowerCase()}`}
                        className={`rise press block origin-bottom rounded-[8px] hover:opacity-80 ${REC_STYLE[b.screen.recommendation].block}`}
                        style={{ height: `calc((100% - ${(busiest - 1) * 3}px) / ${busiest})`, animationDelay: `${(d.i + k) * 16}ms` }}
                      >
                        <span className="sr-only">{b.projectName}</span>
                      </Link>
                    ))}
                  </div>
                  <span className={`mt-2 text-center text-[11px] leading-tight ${isToday ? "font-semibold text-ink" : weekend ? "text-ink-soft/60" : "text-ink-soft"}`}>
                    <span className="block">{isToday ? "Today" : d.weekday}</span>
                    <span className="block">{d.label}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </figure>
  );
}
