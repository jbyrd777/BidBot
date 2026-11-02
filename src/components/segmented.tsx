import Link from "next/link";

export interface Segment {
  key: string;
  label: string;
  href: string;
  count?: number;
}

/** A small flat switch: gray track, the chosen option on a white pill. */
export function Segmented({ segments, active, label }: { segments: Segment[]; active: string; label: string }) {
  return (
    <nav aria-label={label} className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-[10px] bg-sunk p-0.5">
      {segments.map((s) => {
        const on = s.key === active;
        return (
          <Link
            key={s.key}
            href={s.href}
            scroll={false}
            aria-current={on ? "page" : undefined}
            className={`press flex h-8 shrink-0 items-center gap-1.5 rounded-[8px] px-2.5 text-[12px] font-medium sm:px-3 ${
              on ? "bg-core text-ink shadow-[0_1px_2px_rgb(0_0_0/0.08)]" : "text-ink-soft hover:text-ink"
            }`}
          >
            {s.label}
            {s.count !== undefined && <span className="text-ink-soft">{s.count}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
