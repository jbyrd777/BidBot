"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { SquaresFour, Tray, UsersThree, CaretDown, EnvelopeSimple, ChatCircleDots } from "@phosphor-icons/react";

type Counts = { pending: number; bid: number; no_bid: number };

const SUB = [
  { view: "pending", label: "Undecided" },
  { view: "bid", label: "Bidding" },
  { view: "no_bid", label: "Not bidding" },
] as const;

function Item({ href, active, icon, children }: { href: string; active: boolean; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`press flex h-10 items-center gap-3 rounded-[10px] px-3 text-[14px] font-medium ${active ? "bg-canvas text-ink" : "text-ink/80 hover:bg-canvas/60"}`}
    >
      {icon}
      {children}
    </Link>
  );
}

export function Sidebar({ company, counts }: { company: string; counts: Counts }) {
  const path = usePathname();
  const params = useSearchParams();
  const onBids = path.startsWith("/bids");
  const view = params.get("view") ?? "pending";

  return (
    <aside className="sticky top-0 hidden h-dvh w-[236px] shrink-0 flex-col px-4 py-6 lg:flex">
      <Link href="/" className="px-3 text-[19px] font-bold tracking-[-0.02em]">
        {company}
      </Link>

      <nav aria-label="Main" className="mt-8 flex flex-col gap-1">
        <Item href="/" active={path === "/"} icon={<SquaresFour size={19} aria-hidden />}>
          Dashboard
        </Item>
        <Item href="/chat" active={path === "/chat"} icon={<ChatCircleDots size={19} aria-hidden />}>
          Chat
        </Item>
        <Item href="/bids" active={onBids && !path.startsWith("/bids/")} icon={<Tray size={19} aria-hidden />}>
          <span className="flex-1">Bids</span>
          <CaretDown size={14} aria-hidden />
        </Item>
        <ul className="mb-1 ml-[22px] flex flex-col border-l border-hairline pl-4">
          {SUB.map((s) => {
            const on = path === "/bids" && view === s.view;
            return (
              <li key={s.view}>
                <Link
                  href={`/bids?view=${s.view}`}
                  aria-current={on ? "page" : undefined}
                  className={`flex h-8 items-center gap-2 text-[13px] ${on ? "font-semibold text-ink" : "text-ink/70 hover:text-ink"}`}
                >
                  {s.label}
                  {s.view === "pending" && counts.pending > 0 && (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1.5 text-[10px] font-semibold text-core">{counts.pending}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
        <Item href="/team" active={path === "/team"} icon={<UsersThree size={19} aria-hidden />}>
          Bot team
        </Item>
      </nav>

      <div className="card mt-auto p-4">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-core">
          <EnvelopeSimple size={16} weight="fill" aria-hidden />
        </span>
        <p className="mt-3 text-[15px] font-bold">Connect your inbox</p>
        <p className="mt-1 text-[12px] leading-snug text-ink-soft">Bid Desk is reading sample invitations. Point it at the inbox your GCs send to.</p>
        <Link href="/team" className="press mt-3 flex h-9 items-center justify-center rounded-[8px] bg-ink text-[13px] font-semibold text-core hover:opacity-90">
          Set up Bid Desk
        </Link>
      </div>
    </aside>
  );
}

/** Below the sidebar breakpoint the same destinations sit in a scrolling row under the top bar. */
export function MobileNav({ counts }: { counts: Counts }) {
  const path = usePathname();
  const links = [
    { href: "/", label: "Dashboard", on: path === "/" },
    { href: "/chat", label: "Chat", on: path === "/chat" },
    { href: "/bids", label: `Bids ${counts.pending ? `(${counts.pending})` : ""}`.trim(), on: path.startsWith("/bids") },
    { href: "/team", label: "Bot team", on: path === "/team" },
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
