import Link from "next/link";
import type { DayStack } from "@/lib/dashboard";
import { shortDate, weekday } from "@/lib/dashboard";
import { REC_STYLE } from "./labels";

const H = 220;

function niceStep(max: number) {
  if (max <= 4) return 1;
  if (max <= 8) return 2;
  if (max <= 20) return 5;
  return Math.ceil(max / 40) * 10;
}

/**
 * Bids due per day. Likely bids and ones that need a look stack above the line,
 * likely passes hang below it, like income over expenses in the reference.
 * One day is in color with a tooltip; the rest stay gray until chosen.
 */
export function DueChart({ days, selected, hrefFor }: { days: DayStack[]; selected: string; hrefFor: (iso: string) => string }) {
  const maxUp = Math.max(1, ...days.map((d) => d.counts.bid + d.counts.review));
  const maxDown = Math.max(0, ...days.map((d) => d.counts.no_bid));
  const step = niceStep(Math.max(maxUp, maxDown));
  const top = Math.ceil(maxUp / step);
  const bottom = Math.max(1, Math.ceil(maxDown / step));
  const unit = H / (top + bottom);
  const zero = top * unit;
  const px = (n: number) => (n / step) * unit;
  const ticks = [...Array.from({ length: top + 1 }, (_, i) => (top - i) * step), ...Array.from({ length: bottom }, (_, i) => -(i + 1) * step)];
  const sel = days.findIndex((d) => d.iso === selected);
  const dense = days.length > 7;

  return (
    <div className="relative mt-5 flex gap-3">
      <div className="relative w-6 shrink-0 text-right text-[11px] text-ink-soft" style={{ height: H }} aria-hidden>
        {ticks.map((t, i) => (
          <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: i * unit }}>
            {t}
          </span>
        ))}
      </div>

      <div className="relative min-w-0 flex-1">
        <div className="pointer-events-none absolute inset-x-0 top-0" style={{ height: H }} aria-hidden>
          {ticks.map((t, i) => (
            <span key={t} className={`absolute inset-x-0 border-t ${t === 0 ? "border-ink/15" : "border-hairline"}`} style={{ top: i * unit }} />
          ))}
        </div>

        <ol className="relative grid" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
          {days.map((d, i) => {
            const on = i === sel;
            const up = d.counts.bid + d.counts.review;
            const fill = (r: keyof typeof REC_STYLE) => (on ? REC_STYLE[r].fill : "fill-ghost");
            const name = `${weekday(d.iso, "long")} ${shortDate(d.iso)}`;
            return (
              <li key={d.iso} className="relative flex flex-col items-center">
                <Link
                  href={hrefFor(d.iso)}
                  scroll={false}
                  aria-current={on ? "date" : undefined}
                  aria-label={`${name}: ${d.counts.bid} look like a bid, ${d.counts.review} need a look, ${d.counts.no_bid} likely pass`}
                  className="group relative block w-full"
                  style={{ height: H }}
                >
                  <span className={`absolute inset-x-0 mx-auto flex flex-col-reverse gap-[3px] ${dense ? "w-[62%]" : "w-[54%] max-w-[46px]"}`} style={{ bottom: H - zero + 2 }}>
                    {up === 0 && d.counts.no_bid === 0 && <span className="h-1.5 rounded-[4px] fill-ghost" />}
                    {d.counts.bid > 0 && <span className={`grow rounded-[6px] ${fill("bid")}`} style={{ height: px(d.counts.bid) - 3 }} />}
                    {d.counts.review > 0 && <span className={`grow rounded-[6px] ${fill("review")}`} style={{ height: px(d.counts.review) - 3 }} />}
                  </span>
                  {d.counts.no_bid > 0 && (
                    <span className={`absolute inset-x-0 mx-auto rounded-[6px] ${dense ? "w-[62%]" : "w-[54%] max-w-[46px]"} ${fill("no_bid")}`} style={{ top: zero + 2, height: px(d.counts.no_bid) - 3 }} />
                  )}
                  {!on && <span className="absolute inset-0 rounded-[8px] group-hover:bg-ink/[0.03]" aria-hidden />}
                </Link>

                {on && (
                  <div
                    className={`card pointer-events-none absolute z-10 w-[148px] p-2.5 text-[11px] shadow-[0_6px_24px_rgb(0_0_0/0.10)] ${i > days.length - 3 ? "right-[70%]" : "left-[70%]"}`}
                    style={{ top: Math.max(0, zero - px(up) - 20) }}
                  >
                    <p className="mb-1.5 text-ink-soft">{name}</p>
                    {(["bid", "review", "no_bid"] as const).map((r) => (
                      <p key={r} className="flex items-center justify-between gap-2 py-px">
                        <span className="flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-[2px] ${REC_STYLE[r].fill}`} aria-hidden />
                          {REC_STYLE[r].text}
                        </span>
                        <span className="font-semibold">{d.counts[r]}</span>
                      </p>
                    ))}
                  </div>
                )}

                <span className={`mt-2 text-[11px] ${on ? "font-semibold text-ink" : "text-ink-soft"}`}>{dense ? weekday(d.iso).slice(0, 1) : weekday(d.iso)}</span>
                <span className="text-[10px] text-ink-soft">{shortDate(d.iso)}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
