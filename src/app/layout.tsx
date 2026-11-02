import { connection } from "next/server";
import type { Metadata } from "next";
import { IconBoard, IconMail, IconSearch, IconTeam } from "@/components/icons";
import { NavLink } from "@/components/nav-link";
import { getCompany, listBids } from "@/lib/data/store";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bid Desk",
  description: "Your flooring bid desk, run by a team of bots",
};

export const instant = false;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  await connection();
  const company = getCompany();
  const waiting = listBids().filter((b) => b.decision === "pending").length;
  const initials = company.name.split(" ").map((w) => w[0]).slice(0, 2).join("");

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full p-3 md:p-4">
        <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1480px] flex-col gap-3 md:flex-row md:gap-4">
          <aside className="card flex shrink-0 flex-col p-4 md:w-[232px] md:p-5">
            <div className="flex items-center gap-2.5 px-1">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-lime text-[13px] font-bold text-ink">{initials}</span>
              <div className="leading-tight">
                <p className="text-[15px] font-bold tracking-tight">{company.name}</p>
                <p className="text-xs text-ink-soft">Bid Desk</p>
              </div>
            </div>

            <nav className="mt-6 flex gap-1 md:flex-col">
              <NavLink href="/bids" badge={waiting}>
                <IconBoard /> Bid board
              </NavLink>
              <NavLink href="/">
                <IconTeam /> Bot team
              </NavLink>
            </nav>

            <div className="mt-auto hidden rounded-2xl bg-sunk p-4 md:block">
              <IconMail className="text-ink" />
              <p className="mt-3 text-sm font-semibold">Connect your bid inbox</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                Bid Desk is reading sample invitations. Connect Gmail or Outlook to read yours as they arrive.
              </p>
              <p className="mt-3 text-xs font-medium text-ink-soft">Coming next</p>
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col gap-3 md:gap-4">
            <header className="card flex items-center gap-3 px-4 py-3">
              <form action="/bids" className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-sunk px-3 py-2 md:max-w-sm">
                <IconSearch className="text-ink-soft" />
                <label htmlFor="q" className="sr-only">Search bids</label>
                <input id="q" name="q" placeholder="Search projects or GCs" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-soft" />
                <input type="hidden" name="view" value="all" />
              </form>
              <div className="ml-auto flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-xs font-semibold text-panel" aria-hidden>
                  JB
                </span>
                <div className="hidden leading-tight sm:block">
                  <p className="text-sm font-semibold">Jesse Byrd</p>
                  <p className="text-xs text-ink-soft">Owner</p>
                </div>
              </div>
            </header>
            <main className="min-w-0 flex-1">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
