"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, children, badge }: { href: string; children: React.ReactNode; badge?: number }) {
  const path = usePathname();
  const active = href === "/" ? path === "/" : path.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`press flex items-center gap-2 rounded-[10px] px-3.5 py-2 text-sm font-medium ${
        active ? "bg-ink text-panel" : "text-ink-soft hover:bg-sunk hover:text-ink"
      }`}
    >
      {children}
      {badge ? (
        <span
          className={`grid h-5 min-w-5 place-items-center rounded-md px-1.5 text-[11px] font-semibold ${active ? "bg-lime text-ink" : "bg-sunk text-ink"}`}
          aria-label={`${badge} waiting for a decision`}
        >
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
