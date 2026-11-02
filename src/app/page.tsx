import { connection } from "next/server";
import Link from "next/link";
import { DEFAULT_ROSTER } from "@/lib/bots/roster";
import { listBids, today } from "@/lib/data/store";
import { daysBetween } from "@/lib/itb/dates";

const STATUS = {
  live: { text: "Working", cls: "bg-lime text-ink" },
  review: { text: "In review mode", cls: "bg-sun text-ink" },
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
        <h1 className="text-2xl font-bold tracking-tight md:text-[28px]">Bot team</h1>
        <p className="mt-1 text-sm text-ink-soft">Seven bots, each owning one part of the bid cycle. Every outbound step waits for a person.</p>
      </div>

      <section className="card grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:p-7">
        <div>
          <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS[lead.status].cls}`}>{STATUS[lead.status].text}</span>
          <h2 className="mt-3 text-xl font-bold tracking-tight">{lead.name}</h2>
          <p className="mt-1 max-w-xl text-[15px] leading-relaxed">{lead.role}.</p>
          <p className="mt-2 text-sm text-ink-soft">{lead.checkpoint}.</p>
        </div>
        <div className="flex gap-3">
          <div className="rounded-2xl bg-sunk px-5 py-4">
            <p className="text-[34px] font-bold leading-none tracking-tight">{bids.length}</p>
            <p className="mt-2 text-xs text-ink-soft">Invitations read</p>
          </div>
          <div className="rounded-2xl bg-lime px-5 py-4 text-ink">
            <p className="text-[34px] font-bold leading-none tracking-tight">{waiting}</p>
            <p className="mt-2 text-xs">Waiting on you</p>
          </div>
          <div className="rounded-2xl bg-sunk px-5 py-4">
            <p className="text-[34px] font-bold leading-none tracking-tight">{thisWeek}</p>
            <p className="mt-2 text-xs text-ink-soft">Due this week</p>
          </div>
        </div>
        <Link href="/bids" className="w-fit rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-panel hover:opacity-90 md:col-span-2">
          Open the bid board
        </Link>
      </section>

      <ul className="grid gap-3 sm:grid-cols-2 md:gap-4 xl:grid-cols-3">
        {rest.map((bot) => {
          const s = STATUS[bot.status];
          return (
            <li key={bot.kind} className="card flex flex-col p-5">
              <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${s.cls}`}>{s.text}</span>
              <h2 className="mt-3 text-[17px] font-bold tracking-tight">{bot.name}</h2>
              <p className="mt-1 text-sm leading-relaxed">{bot.role}.</p>
              <div className="mt-auto pt-4 text-xs text-ink-soft">
                <p>Owns: {bot.owns}</p>
                <p className="mt-1">{bot.checkpoint}</p>
                <p className="mt-3 flex flex-wrap gap-1">
                  {bot.channels.map((c) => (
                    <span key={c} className="rounded-md bg-sunk px-1.5 py-0.5 font-medium capitalize text-ink">{c}</span>
                  ))}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
