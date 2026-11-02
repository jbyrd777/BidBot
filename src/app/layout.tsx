import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
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

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full md:grid md:grid-cols-[220px_1fr]">
        <aside className="border-b border-rule bg-panel px-5 py-5 md:border-b-0 md:border-r md:py-8">
          <p className="text-lg font-bold tracking-tight">{company.name}</p>
          <p className="mt-0.5 text-sm text-ink-soft">Bid Desk</p>
          <nav className="mt-6 flex gap-4 text-[15px] md:flex-col md:gap-1">
            <Link href="/" className="rounded px-2 py-1.5 hover:bg-paper">
              Team
            </Link>
            <Link href="/bids" className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-paper">
              <span>Bid board</span>
              {waiting > 0 && (
                <span className="ml-2 rounded-full bg-plan px-2 text-xs font-semibold leading-5 text-white" aria-label={`${waiting} waiting for a decision`}>
                  {waiting}
                </span>
              )}
            </Link>
          </nav>
        </aside>
        <main className="min-w-0 px-4 py-6 md:px-10 md:py-10">{children}</main>
      </body>
    </html>
  );
}
