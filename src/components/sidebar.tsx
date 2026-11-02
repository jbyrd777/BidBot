"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { SquaresFour, Tray, HandPalm, Vault, Brain, GearSix } from "@phosphor-icons/react";

type Counts = { pending: number; waiting: number };
export type SideBot = { id: string; name: string; initials: string; main: boolean };

function Item({ href, active, icon, children, badge }: { href: string; active: boolean; icon: React.ReactNode; children: React.ReactNode; badge?: number }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`press flex h-9 items-center gap-3 rounded-[10px] px-3 text-[13px] font-medium ${active ? "bg-canvas text-ink" : "text-ink/80 hover:bg-canvas/60"}`}
    >
      {icon}
      <span className="flex-1 truncate">{children}</span>
      {!!badge && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1.5 text-[10px] font-semibold text-core">{badge}</span>}
    </Link>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-1 mt-5 px-3 text-[11px] font-medium text-ink-soft">{children}</p>;
}

export function Sidebar({ company, counts, bots }: { company: string; counts: Counts; bots: SideBot[] }) {
  const path = usePathname();
  const params = useSearchParams();
  const view = params.get("view") ?? "pending";

  return (
    <aside className="sticky top-0 hidden h-dvh w-[236px] shrink-0 flex-col overflow-y-auto px-4 py-6 lg:flex">
      <Link href="/" className="px-3 text-[19px] font-bold tracking-[-0.02em]">
        {company}
      </Link>

      <Label>Team</Label>
      <nav aria-label="Team" className="flex flex-col gap-0.5">
        {bots.map((b) => {
          const href = b.main ? "/" : `/bots/${b.id}`;
          const on = b.main ? path === "/" : path === href;
          return (
            <Link
              key={b.id}
              href={href}
              aria-current={on ? "page" : undefined}
              className={`press flex h-9 items-center gap-2.5 rounded-[10px] px-2 text-[13px] ${on ? "bg-canvas font-semibold text-ink" : "text-ink/80 hover:bg-canvas/60"} ${b.main ? "font-semibold" : ""}`}
            >
              <span aria-hidden className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[9px] font-semibold ${b.main ? "card-lime !rounded-full" : "bg-sunk"}`}>
                {b.initials}
              </span>
              <span className="truncate">{b.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-3">
        <Item href="/waiting" active={path === "/waiting"} icon={<HandPalm size={18} aria-hidden />} badge={counts.waiting}>
          Needs your OK
        </Item>
      </div>

      <Label>Reports</Label>
      <nav aria-label="Reports" className="flex flex-col gap-0.5">
        <Item href="/dashboard" active={path === "/dashboard"} icon={<SquaresFour size={18} aria-hidden />}>
          Dashboard
        </Item>
        <Item href="/bids" active={path.startsWith("/bids")} icon={<Tray size={18} aria-hidden />} badge={counts.pending}>
          Bids
        </Item>
        {path === "/bids" && (
          <ul className="mb-1 ml-[22px] flex flex-col border-l border-hairline pl-4">
            {[
              ["pending", "Undecided"],
              ["bid", "Bidding"],
              ["no_bid", "Not bidding"],
            ].map(([v, l]) => (
              <li key={v}>
                <Link href={`/bids?view=${v}`} aria-current={view === v ? "page" : undefined} className={`flex h-7 items-center text-[12px] ${view === v ? "font-semibold text-ink" : "text-ink/70 hover:text-ink"}`}>
                  {l}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </nav>

      <Label>Workspace</Label>
      <nav aria-label="Workspace" className="flex flex-col gap-0.5">
        <Item href="/vault" active={path === "/vault"} icon={<Vault size={18} aria-hidden />}>
          Vault
        </Item>
        <Item href="/memory" active={path === "/memory"} icon={<Brain size={18} aria-hidden />}>
          Memory
        </Item>
        <Item href="/settings" active={path === "/settings"} icon={<GearSix size={18} aria-hidden />}>
          Settings
        </Item>
      </nav>
    </aside>
  );
}

/** Below the sidebar breakpoint the main destinations sit in a scrolling row under the top bar. */
export function MobileNav({ counts }: { counts: Counts }) {
  const path = usePathname();
  const links = [
    { href: "/", label: "Chat", on: path === "/" || path.startsWith("/bots") },
    { href: "/waiting", label: counts.waiting ? `Waiting (${counts.waiting})` : "Waiting", on: path === "/waiting" },
    { href: "/dashboard", label: "Dashboard", on: path === "/dashboard" },
    { href: "/bids", label: "Bids", on: path.startsWith("/bids") },
    { href: "/vault", label: "Vault", on: path === "/vault" },
    { href: "/settings", label: "Settings", on: path === "/settings" || path === "/memory" },
  ];
  return (
    <nav aria-label="Main" className="-mx-1 flex gap-1 overflow-x-auto px-1 lg:hidden">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={l.on ? "page" : undefined}
          className={`press shrink-0 rounded-[10px] px-3.5 py-2 text-[13px] font-medium ${l.on ? "bg-core text-ink shadow-[0_1px_2px_rgb(0_0_0/0.06)]" : "text-ink/70"}`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
