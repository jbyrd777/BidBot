"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { springs } from "@/lib/motion-tokens";

export interface Segment {
  key: string;
  label: string;
  href: string;
  count?: number;
}

/** The signature control: a frosted capsule whose lens slides to the chosen segment on a spring. */
export function GlassSegmented({ segments, active, label, id }: { segments: Segment[]; active: string; label: string; id: string }) {
  const reduce = useReducedMotion();
  return (
    <nav aria-label={label} className="glass inline-flex max-w-full gap-0.5 overflow-x-auto rounded-full p-1">
      {segments.map((s) => {
        const on = s.key === active;
        return (
          <Link
            key={s.key}
            href={s.href}
            scroll={false}
            aria-current={on ? "page" : undefined}
            className={`press relative flex h-9 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium sm:px-4 sm:text-[13px] ${on ? "text-ink" : "text-ink-soft hover:text-ink"}`}
          >
            {on && (
              <motion.span
                layoutId={`lens-${id}`}
                transition={reduce ? { duration: 0 } : springs.snappy}
                className="lens absolute inset-0 rounded-full"
                aria-hidden
              />
            )}
            <span className="relative">{s.label}</span>
            {s.count !== undefined && <span className={`relative text-ink-soft ${on ? "" : "hidden sm:inline"}`}>{s.count}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
