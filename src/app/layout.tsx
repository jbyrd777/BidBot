import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { Bell, ChatCircleDots } from "@phosphor-icons/react/dist/ssr";
import { MobileNav, Sidebar } from "@/components/sidebar";
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
  const bids = listBids();
  const counts = {
    pending: bids.filter((b) => b.decision === "pending").length,
    bid: bids.filter((b) => b.decision === "bid").length,
    no_bid: bids.filter((b) => b.decision === "no_bid").length,
  };

  return (
    <html lang="en">
      <body className="min-h-dvh">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-30 focus:rounded-[8px] focus:bg-ink focus:px-4 focus:py-2 focus:text-core">
          Skip to content
        </a>
        <div className="flex">
          <Suspense fallback={<div className="hidden w-[236px] shrink-0 lg:block" />}>
            <Sidebar company={company.name} counts={counts} />
          </Suspense>

          <div className="min-w-0 flex-1 bg-canvas p-3 md:p-5 lg:my-3 lg:mr-3 lg:rounded-[22px]">
            <header className="flex flex-col gap-3">
              <div className="flex items-center gap-2 md:gap-3">
                <Link href="/" className="mr-1 text-[17px] font-bold tracking-[-0.02em] lg:hidden">
                  {company.name}
                </Link>
                <form action="/chat" className="hidden h-11 w-full max-w-[380px] items-center gap-2 rounded-[10px] bg-core px-3.5 sm:flex">
                  <ChatCircleDots size={18} className="shrink-0 text-ink-soft" aria-hidden />
                  <label htmlFor="q" className="sr-only">
                    Ask Bid Desk
                  </label>
                  <input id="q" name="q" type="text" autoComplete="off" placeholder="Ask Bid Desk, like what is due this week" className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-ink-soft" />
                </form>
                <div className="ml-auto flex items-center gap-2">
                  <Link
                    href="/bids?view=pending"
                    title={`${counts.pending} bids waiting on a call`}
                    className="press relative grid h-11 w-11 place-items-center rounded-[10px] bg-core hover:bg-sunk"
                  >
                    <Bell size={19} aria-hidden />
                    <span className="sr-only">{counts.pending} bids waiting on a call</span>
                    {counts.pending > 0 && <span aria-hidden className="absolute right-3 top-3 h-2 w-2 rounded-full bg-ember ring-2 ring-core" />}
                  </Link>
                  <span className="flex h-11 items-center gap-2.5 rounded-[10px] bg-core py-1 pl-1.5 pr-3">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-[11px] font-semibold text-core">JB</span>
                    <span className="hidden leading-tight sm:block">
                      <span className="block text-[13px] font-semibold">Jesse Byrd</span>
                      <span className="block text-[11px] text-ink-soft">Owner</span>
                    </span>
                  </span>
                </div>
              </div>
              <MobileNav counts={counts} />
            </header>

            <main id="main" className="mt-4 md:mt-5">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
