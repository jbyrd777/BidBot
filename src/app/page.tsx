import { connection } from "next/server";
import Link from "next/link";
import { DEFAULT_ROSTER } from "@/lib/bots/roster";
import { listBids, today } from "@/lib/data/store";
import { daysBetween } from "@/lib/itb/dates";

const STATUS = {
  live: { text: "Working", cls: "bg-go" },
  review: { text: "In review mode", cls: "bg-hold" },
  off: { text: "Not set up yet", cls: "bg-rule" },
} as const;

export const instant = false;

export default async function TeamPage() {
  await connection();
  const bids = listBids();
  const t = today();
  const waiting = bids.filter((b) => b.decision === "pending").length;
  const thisWeek = bids.filter((b) => b.due && daysBetween(t, b.due.date) >= 0 && daysBetween(t, b.due.date) < 7 && b.decision !== "no_bid").length;

  return (
    <div className="max-w-5xl">
      <h1 className="text-3xl font-bold tracking-tight">Your team</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">
        Bid Desk read {bids.length} invitations. {waiting} are waiting on your bid or no bid call, and {thisWeek} are due in the next seven days.{" "}
        <Link href="/bids" className="font-medium text-plan underline underline-offset-2">
          Open the bid board
        </Link>
      </p>

      <ul className="mt-8 divide-y divide-rule border-y border-rule">
        {DEFAULT_ROSTER.map((bot) => {
          const s = STATUS[bot.status];
          return (
            <li key={bot.kind} className="grid gap-2 py-5 md:grid-cols-[200px_1fr_220px] md:gap-6">
              <div>
                <p className="text-lg font-semibold">{bot.name}</p>
                <p className="mt-1 flex items-center gap-2 text-sm text-ink-soft">
                  <span aria-hidden className={`inline-block h-2 w-2 rounded-full ${s.cls}`} />
                  {s.text}
                </p>
              </div>
              <div className="text-[15px] leading-relaxed">
                <p>{bot.role}.</p>
                <p className="mt-1 text-sm text-ink-soft">Owns {bot.owns.toLowerCase()}. Reach it by {bot.channels.join(", ")}.</p>
              </div>
              <p className="text-sm text-ink-soft md:text-right">{bot.checkpoint}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
