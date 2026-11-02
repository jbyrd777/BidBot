import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { MainNav } from "@/components/nav-link";
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
    <html lang="en" className="antialiased">
      <body className="ambient min-h-dvh">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-30 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-core"
        >
          Skip to content
        </a>

        {/* Floating island nav: glass, detached from the top edge, sticky. */}
        <header className="sticky top-3 z-20 px-3 md:top-4">
          <div className="glass mx-auto flex w-full max-w-[1180px] flex-wrap items-center gap-x-4 gap-y-2 rounded-[28px] py-2 pl-2 pr-2 md:flex-nowrap md:rounded-full">
            <Link href="/bids" className="press flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3">
              <span className="core-lime grid h-9 w-9 place-items-center !rounded-full text-[13px] font-semibold">{initials}</span>
              <span className="leading-tight">
                <span className="block text-[14px] font-semibold tracking-tight">{company.name}</span>
                <span className="block text-[11px] text-ink-soft">Bid Desk</span>
              </span>
            </Link>

            <div className="order-3 shrink-0 md:order-none">
              <MainNav waiting={waiting} />
            </div>

            <form action="/bids" role="search" className="press order-4 flex h-10 min-w-[120px] flex-1 md:order-none md:ml-auto items-center gap-2 rounded-full bg-core/70 px-3.5 shadow-[inset_0_0_0_1px_var(--color-hairline)] md:max-w-[260px]">
              <MagnifyingGlass weight="light" size={18} className="shrink-0 text-ink-soft" aria-hidden />
              <label htmlFor="q" className="sr-only">Search bids</label>
              <input id="q" name="q" type="search" placeholder="Search bids" className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-ink-soft" />
              <input type="hidden" name="view" value="all" />
            </form>

            <span className="ml-auto grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink md:ml-0 text-[12px] font-semibold text-core" title="Jesse Byrd, owner">
              JB
            </span>
          </div>
        </header>

        <main id="main" className="mx-auto max-w-[1180px] px-3 pb-6 pt-6 md:px-4 md:pt-8">
          {children}
        </main>

        <footer className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-2 px-4 pb-8 text-xs text-ink-soft md:px-5">
          <span>Bid Desk reads sample invitations until an inbox is connected.</span>
          <span>Every outbound step waits for a person.</span>
        </footer>
      </body>
    </html>
  );
}
