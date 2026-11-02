import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { IconSearch } from "@/components/icons";
import { NavLink } from "@/components/nav-link";
import { getCompany, listBids } from "@/lib/data/store";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Bid Desk", template: "%s | Bid Desk" },
  description: "Every invitation to bid, read and screened for your flooring team.",
  openGraph: { title: "Bid Desk", description: "Every invitation to bid, read and screened for your flooring team." },
};

export const instant = false;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  await connection();
  const company = getCompany();
  const waiting = listBids().filter((b) => b.decision === "pending").length;
  const initials = company.name.split(" ").map((w) => w[0]).slice(0, 2).join("");

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-dvh">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-10 focus:rounded-[10px] focus:bg-ink focus:px-4 focus:py-2 focus:text-panel">
          Skip to content
        </a>
        <div className="mx-auto flex max-w-[1360px] flex-col gap-4 px-3 py-3 md:px-6 md:py-5">
          <header className="card flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 md:px-5">
            <Link href="/bids" className="flex items-center gap-2.5">
              <span className="display grid h-9 w-9 place-items-center rounded-[10px] bg-lime text-[13px] font-bold text-ink">{initials}</span>
              <span className="leading-tight">
                <span className="display block text-[15px] font-semibold tracking-tight">{company.name}</span>
                <span className="block text-xs text-ink-soft">Bid Desk</span>
              </span>
            </Link>

            <nav aria-label="Main" className="order-3 flex w-full gap-1 md:order-none md:w-auto">
              <NavLink href="/bids" badge={waiting}>Bid board</NavLink>
              <NavLink href="/">Bot team</NavLink>
            </nav>

            <form action="/bids" role="search" className="order-4 flex min-w-0 basis-full items-center gap-2 rounded-[10px] bg-sunk px-3 py-2 md:order-none md:ml-auto md:max-w-xs md:flex-1 md:basis-auto">
              <IconSearch className="text-ink-soft" />
              <label htmlFor="q" className="sr-only">Search bids</label>
              <input id="q" name="q" type="search" placeholder="Search projects, GCs, cities" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-soft" />
              <input type="hidden" name="view" value="all" />
            </form>

            <span className="display ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-ink text-xs font-semibold text-panel md:ml-0" title="Jesse Byrd, owner">
              JB
            </span>
          </header>

          <main id="main" className="min-w-0">{children}</main>

          <footer className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2 text-xs text-ink-soft">
            <span>Bid Desk reads sample invitations until an inbox is connected.</span>
            <span>Every outbound step waits for a person.</span>
          </footer>
        </div>
      </body>
    </html>
  );
}
