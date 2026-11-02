import { connection } from "next/server";
import Link from "next/link";
import { IconCalendar, IconCheck, IconClock, IconLayers } from "@/components/icons";
import { DecisionText, GcMark, RecommendationTag, ScopeChips, formatDue } from "@/components/labels";
import { TapeRule } from "@/components/tape-rule";
import { listBids, today, type Bid, type Decision } from "@/lib/data/store";
import { daysBetween } from "@/lib/itb/dates";

const VIEWS: { key: Decision | "all"; label: string }[] = [
  { key: "pending", label: "Undecided" },
  { key: "bid", label: "Bidding" },
  { key: "no_bid", label: "Not bidding" },
  { key: "all", label: "All" },
];

function group(bids: Bid[], t: string) {
  const groups: { title: string; bids: Bid[] }[] = [
    { title: "Past due", bids: [] },
    { title: "Due this week", bids: [] },
    { title: "Due later", bids: [] },
    { title: "No due date yet", bids: [] },
  ];
  for (const b of bids) {
    if (!b.due) groups[3].bids.push(b);
    else {
      const d = daysBetween(t, b.due.date);
      groups[d < 0 ? 0 : d < 7 ? 1 : 2].bids.push(b);
    }
  }
  return groups.filter((g) => g.bids.length);
}

function Stat({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: number; note: string }) {
  return (
    <div className="card p-5">
      <p className="flex items-center gap-2 text-sm font-medium text-ink-soft">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-sunk text-ink">{icon}</span>
        {label}
      </p>
      <p className="mt-4 text-[34px] font-bold leading-none tracking-tight">{value}</p>
      <p className="mt-2 text-xs text-ink-soft">{note}</p>
    </div>
  );
}

export const instant = false;

export default async function BidBoard({ searchParams }: PageProps<"/bids">) {
  const params = await searchParams;
  const view = (VIEWS.find((v) => v.key === params.view)?.key ?? "pending") as Decision | "all";
  const q = typeof params.q === "string" ? params.q.trim().toLowerCase() : "";
  await connection();
  const all = listBids();
  const t = today();
  const matches = (b: Bid) => !q || [b.projectName, b.gcName, b.requestedBy, b.location].some((f) => f?.toLowerCase().includes(q));
  const shown = all.filter((b) => (view === "all" || b.decision === view) && matches(b));

  const open = all.filter((b) => b.decision !== "no_bid");
  const thisWeek = open.filter((b) => b.due && daysBetween(t, b.due.date) >= 0 && daysBetween(t, b.due.date) < 7).length;
  const looksGood = all.filter((b) => b.decision === "pending" && b.screen.recommendation === "bid").length;
  const waiting = all.filter((b) => b.decision === "pending").length;
  const bidding = all.filter((b) => b.decision === "bid").length;

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      <div className="px-1 pt-1">
        <h1 className="text-2xl font-bold tracking-tight md:text-[28px]">Bid board</h1>
        <p className="mt-1 text-sm text-ink-soft">Every invitation Bid Desk has read, with its first read on each. You make the call.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <Stat icon={<IconLayers />} label="Waiting on you" value={waiting} note={`${all.length} invitations read`} />
        <Stat icon={<IconClock />} label="Due this week" value={thisWeek} note="Not counting passes" />
        <Stat icon={<IconCheck />} label="Look like a bid" value={looksGood} note="Fit your rules, still undecided" />
        <Stat icon={<IconCalendar />} label="Bidding" value={bidding} note="Marked by your team" />
      </div>

      <TapeRule bids={all} today={t} />

      <section className="card p-3 md:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 px-2 pt-1">
          <h2 className="text-lg font-bold tracking-tight">{q ? `Results for "${q}"` : "Invitations"}</h2>
          <nav aria-label="Filter bids" className="flex flex-wrap gap-1 rounded-full bg-sunk p-1">
            {VIEWS.map((v) => {
              const count = v.key === "all" ? all.length : all.filter((b) => b.decision === v.key).length;
              const active = v.key === view;
              return (
                <Link
                  key={v.key}
                  href={`/bids?view=${v.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${active ? "bg-panel text-ink shadow-sm" : "text-ink-soft hover:text-ink"}`}
                >
                  {v.label} {count}
                </Link>
              );
            })}
          </nav>
        </div>

        {shown.length === 0 && (
          <p className="px-2 py-10 text-sm text-ink-soft">
            {q
              ? "No invitation matches that search. Try a project name, a GC or a city."
              : view === "pending"
                ? "Every invitation has a bid or no bid call."
                : "Make a call on an undecided bid and it shows up here."}
          </p>
        )}

        {group(shown, t).map((g) => (
          <div key={g.title} className="mt-4">
            <h3 className="px-2 text-xs font-semibold text-ink-soft">
              {g.title} ({g.bids.length})
            </h3>
            <ul className="mt-1">
              {g.bids.map((b) => {
                const due = formatDue(b.due, t);
                return (
                  <li key={b.id}>
                    <Link
                      href={`/bids/${b.id}`}
                      className="grid items-center gap-x-5 gap-y-2 rounded-2xl px-2 py-3 hover:bg-sunk md:grid-cols-[minmax(0,1fr)_150px_220px_100px]"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <GcMark name={b.gcName ?? b.requestedBy} />
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-semibold">
                            {b.projectName}
                            {b.packageName && <span className="font-normal text-ink-soft"> for {b.packageName.toLowerCase()}</span>}
                          </p>
                          <p className="truncate text-xs text-ink-soft">{[b.gcName ?? b.requestedBy, b.location].filter(Boolean).join(", ")}</p>
                          <div className="mt-1.5">
                            <ScopeChips scope={b.flooringScope} />
                          </div>
                        </div>
                      </div>
                      <div className="pl-[52px] md:pl-0">
                        <p className={`text-sm font-bold ${due.late ? "text-stop" : ""}`}>{due.when}</p>
                        <p className="text-xs text-ink-soft">{due.date}</p>
                      </div>
                      <div className="pl-[52px] md:pl-0">
                        <RecommendationTag value={b.screen.recommendation} />
                        <p className="mt-1 text-xs text-ink-soft">{b.screen.reasons[0]}</p>
                      </div>
                      <div className="pl-[52px] md:pl-0 md:text-right">
                        <DecisionText value={b.decision} />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
