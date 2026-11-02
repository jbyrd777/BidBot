import { connection } from "next/server";
import Link from "next/link";
import { DEFAULT_ROSTER } from "@/lib/bots/roster";
import { listBids, today } from "@/lib/data/store";
import { daysBetween } from "@/lib/itb/dates";

const STATUS = {
  live: { text: "Working", cls: "bg-lime text-ink" },
  review: { text: "In review mode", cls: "bg-lime-wash text-ink" },
  off: { text: "Not set up yet", cls: "bg-sunk text-ink-soft" },
} as const;

export const instant = false;

export default async function TeamPage() {
  await connection();
  const bids = listBids();
  const t = today();
  const waiting = bids.filter((b) => b.decision === "pending").length;
  const thisWeek = bids.filter((b) => b.due && daysBetween(t, b.due.date) >= 0 && daysBetween(t, b.due.date) < 7 && b.decision !== "no_bid").length;
  const [lead, ...rest] = DEFAULT_ROSTER;

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      <div className="px-1 pt-1">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Bot team</h1>
        <p className="mt-1 text-sm text-ink-soft">Seven bots, each owning one part of the bid cycle. Every outbound step waits for a person.</p>
      </div>

      <section className="card grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:p-7">
        <div>
          <span className={`inline-block rounded-md px-2 py-1 text-xs font-semibold ${STATUS[lead.status].cls}`}>{STATUS[lead.status].text}</span>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">{lead.name}</h2>
          <p className="mt-1 max-w-xl text-[15px] leading-relaxed">{lead.role}.</p>
          <p className="mt-2 text-sm text-ink-soft">{lead.checkpoint}.</p>
        </div>
        <div className="flex gap-3">
          <div className="rounded-[12px] bg-sunk px-5 py-4">
            <p className="display text-4xl font-semibold leading-none tracking-tight">{bids.length}</p>
            <p className="mt-2 text-xs text-ink-soft">Invitations read</p>
          </div>
          <div className="rounded-[12px] bg-lime px-5 py-4 text-ink">
            <p className="display text-4xl font-semibold leading-none tracking-tight">{waiting}</p>
            <p className="mt-2 text-xs">Waiting on you</p>
          </div>
          <div className="rounded-[12px] bg-sunk px-5 py-4">
            <p className="display text-4xl font-semibold leading-none tracking-tight">{thisWeek}</p>
            <p className="mt-2 text-xs text-ink-soft">Due this week</p>
          </div>
        </div>
        <Link href="/bids" className="press w-fit rounded-[10px] bg-ink px-5 py-2.5 text-sm font-semibold text-panel hover:opacity-90 md:col-span-2">
          Open the bid board
        </Link>
      </section>

      <section className="card p-3 md:p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-2 pb-2 pt-1">
          <h2 className="text-lg font-semibold tracking-tight">Coming onto the team</h2>
          <p className="text-xs text-ink-soft">In the order they follow a bid</p>
        </div>
        <ol>
          {rest.map((bot, i) => {
            const s = STATUS[bot.status];
            return (
              <li key={bot.kind} className="grid gap-x-6 gap-y-2 rounded-[14px] px-2 py-4 hover:bg-sunk md:grid-cols-[36px_220px_minmax(0,1fr)_240px]">
                <span className="display hidden h-9 w-9 place-items-center rounded-[10px] bg-sunk text-sm font-semibold text-ink-soft md:grid">{i + 2}</span>
                <div>
                  <h3 className="text-[16px] font-semibold tracking-tight">{bot.name}</h3>
                  <span className={`mt-1.5 inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold ${s.cls}`}>{s.text}</span>
                </div>
                <div className="max-w-[62ch] text-sm leading-relaxed">
                  <p>{bot.role}.</p>
                  <p className="mt-1 text-xs text-ink-soft">Owns: {bot.owns}</p>
                </div>
                <div className="text-xs text-ink-soft">
                  <p>{bot.checkpoint}</p>
                  <p className="mt-2 flex flex-wrap gap-1">
                    {bot.channels.map((c) => (
                      <span key={c} className="rounded-md bg-sunk px-1.5 py-0.5 font-medium capitalize text-ink">{c}</span>
                    ))}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
