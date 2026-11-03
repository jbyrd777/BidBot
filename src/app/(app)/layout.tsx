import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { Bell, ChatCircleDots, SignOut } from "@phosphor-icons/react/dist/ssr";
import { signOut } from "@/app/team-actions";
import { MobileNav, Sidebar } from "@/components/sidebar";
import { initials } from "@/components/team/chat-screen";
import { listBids } from "@/packs/construction/store";
import { waiting } from "@/lib/team/store";
import { getWorkspace } from "@/lib/workspace/load";
import { ROLE_LABEL } from "@/lib/workspace/types";

export const instant = false;

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await connection();
  const ws = await getWorkspace();
  const bids = listBids(ws);
  const counts = { pending: bids.filter((b) => b.decision === "pending").length, waiting: waiting(ws).length };
  const bots = ws.team.bots.map((b) => ({ id: b.id, name: b.name, initials: initials(b.name), main: b.id === "chief" }));

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-30 focus:rounded-[8px] focus:bg-ink focus:px-4 focus:py-2 focus:text-core">
        Skip to content
      </a>
      <div className="flex">
        <Suspense fallback={<div className="hidden w-[236px] shrink-0 lg:block" />}>
          <Sidebar company={ws.company.name} counts={counts} bots={bots} />
        </Suspense>

        <div className="min-w-0 flex-1 bg-canvas p-3 md:p-5 lg:my-3 lg:mr-3 lg:rounded-[22px]">
          <header className="flex flex-col gap-3">
            <div className="flex items-center gap-2 md:gap-3">
              <Link href="/" className="mr-1 truncate text-[17px] font-bold tracking-[-0.02em] lg:hidden">
                {ws.company.name}
              </Link>
              <form action="/" className="hidden h-11 w-full max-w-[380px] items-center gap-2 rounded-[10px] bg-core px-3.5 sm:flex">
                <ChatCircleDots size={18} className="shrink-0 text-ink-soft" aria-hidden />
                <label htmlFor="q" className="sr-only">
                  Ask the team
                </label>
                <input id="q" name="q" type="text" autoComplete="off" placeholder="Ask the team anything" className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-ink-soft" />
              </form>
              <div className="ml-auto flex items-center gap-2">
                <Link href="/waiting" title={`${counts.waiting} waiting for your OK`} className="press relative grid h-11 w-11 place-items-center rounded-[10px] bg-core hover:bg-sunk">
                  <Bell size={19} aria-hidden />
                  <span className="sr-only">{counts.waiting} waiting for your OK</span>
                  {counts.waiting > 0 && <span aria-hidden className="absolute right-3 top-3 h-2 w-2 rounded-full bg-ember ring-2 ring-core" />}
                </Link>
                <span className="flex h-11 items-center gap-2.5 rounded-[10px] bg-core py-1 pl-1.5 pr-1.5">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-[11px] font-semibold text-core">{initials(ws.me.name)}</span>
                  <span className="hidden max-w-[140px] leading-tight sm:block">
                    <span className="block truncate text-[13px] font-semibold">{ws.me.name}</span>
                    <span className="block text-[11px] text-ink-soft">{ROLE_LABEL[ws.me.role]}</span>
                  </span>
                  {ws.mode === "db" && (
                    <form action={signOut}>
                      <button aria-label="Sign out" title="Sign out" className="press grid h-8 w-8 cursor-pointer place-items-center rounded-[8px] text-ink-soft hover:bg-sunk hover:text-ink">
                        <SignOut size={16} aria-hidden />
                      </button>
                    </form>
                  )}
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
    </>
  );
}
