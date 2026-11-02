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
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors ${
        active ? "bg-sunk text-ink" : "text-ink-soft hover:bg-sunk hover:text-ink"
      }`}
    >
      {children}
      {badge ? (
        <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1.5 text-[11px] font-semibold text-panel" aria-label={`${badge} waiting for a decision`}>
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
