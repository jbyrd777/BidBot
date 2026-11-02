import { connection } from "next/server";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { DEFAULT_ROSTER } from "@/lib/bots/roster";
import { listBids, today } from "@/lib/data/store";
import { daysBetween } from "@/lib/itb/dates";

const STATUS = {
  live: { text: "Working", cls: "bg-lime text-ink" },
  review: { text: "In review mode", cls: "bg-lime-wash text-ink" },
  off: { text: "Not set up yet", cls: "bg-sunk text-ink-soft" },
} as const;

export const metadata = { title: "Bot team" };
export const instant = false;

export default async function TeamPage() {
  await connection();
  const bids = listBids();
  const t = today();
  const waiting = bids.filter((b) => b.decision === "pending").length;
  const thisWeek = bids.filter((b) => b.due && b.decision !== "no_bid" && daysBetween(t, b.due.date) >= 0 && daysBetween(t, b.due.date) < 7).length;
  const [lead, ...rest] = DEFAULT_ROSTER;

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <section className="grid gap-3 md:gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="card">
          <div className="flex h-full flex-col p-6 md:p-7">
            <h1 className="text-[30px] font-bold leading-[1.05] tracking-[-0.02em] md:text-[30px]">Bot team</h1>
            <p className="mt-2 max-w-[52ch] text-[14px] text-ink-soft">Seven bots, each owning one part of the bid cycle, in the order they follow a bid. Every outbound step waits for a person.</p>
            <div className="mt-auto pt-8">
              <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS[lead.status].cls}`}>{STATUS[lead.status].text}</span>
              <h2 className="mt-3 text-[22px] font-semibold tracking-[-0.01em]">{lead.name}</h2>
              <p className="mt-1 max-w-[60ch] text-[15px] leading-relaxed">{lead.role}.</p>
              <p className="mt-1 text-[13px] text-ink-soft">{lead.checkpoint}.</p>
            </div>
          </div>
        </div>

        <div className="card-lime">
          <div className="flex h-full flex-col p-6 md:p-7">
            <div className="grid grid-cols-3 gap-3">
              {[
                { v: bids.length, l: "Invitations read" },
                { v: waiting, l: "Waiting on you" },
                { v: thisWeek, l: "Due this week" },
              ].map((s) => (
                <div key={s.l}>
                  <p className="text-[40px] font-semibold leading-none tracking-[-0.03em] tabular-nums">{s.v}</p>
                  <p className="mt-2 text-[12px] text-ink/70">{s.l}</p>
                </div>
              ))}
            </div>
            <Link href="/bids" className="press group mt-auto flex w-full items-center justify-between rounded-[10px] bg-ink py-1.5 pl-5 pr-1.5 text-[14px] font-semibold text-core hover:opacity-90 sm:w-fit sm:gap-6">
              Open the bid board
              <span className="grid h-8 w-8 place-items-center rounded-[8px] fill-lime text-ink transition-transform duration-200 group-hover:translate-x-0.5">
                <ArrowRight size={16} aria-hidden />
              </span>
            </Link>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="p-3 md:p-5">
          <h2 className="px-2 pt-1 text-[19px] font-semibold">Coming onto the team</h2>
          <ol className="mt-2">
            {rest.map((bot, i) => {
              const s = STATUS[bot.status];
              return (
                <li key={bot.kind} className="grid gap-x-6 gap-y-2 rounded-[10px] px-2 py-4 md:grid-cols-[44px_220px_minmax(0,1fr)_240px]">
                  <span aria-hidden className="hidden h-11 w-11 place-items-center rounded-[10px] bg-sunk text-[14px] font-semibold tabular-nums text-ink-soft md:grid">
                    {i + 2}
                  </span>
                  <div>
                    <h3 className="text-[16px] font-semibold tracking-[-0.01em]">{bot.name}</h3>
                    <span className={`mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${s.cls}`}>{s.text}</span>
                  </div>
                  <div className="max-w-[62ch] text-[14px] leading-relaxed">
                    <p>{bot.role}.</p>
                    <p className="mt-1 text-[12px] text-ink-soft">Owns: {bot.owns}</p>
                  </div>
                  <div className="text-[12px] text-ink-soft">
                    <p>{bot.checkpoint}</p>
                    <p className="mt-2 flex flex-wrap gap-1">
                      {bot.channels.map((c) => (
                        <span key={c} className="rounded-[8px] bg-sunk px-2 py-0.5 font-medium capitalize text-ink">
                          {c}
                        </span>
                      ))}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>
    </div>
  );
}
