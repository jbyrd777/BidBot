import { connection } from "next/server";
import Link from "next/link";
import { DecisionText, RecommendationTag, ScopeChips, formatDue } from "@/components/labels";
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

export const instant = false;

export default async function BidBoard({ searchParams }: PageProps<"/bids">) {
  const params = await searchParams;
  const view = (VIEWS.find((v) => v.key === params.view)?.key ?? "pending") as Decision | "all";
  await connection();
  const all = listBids();
  const t = today();
  const shown = view === "all" ? all : all.filter((b) => b.decision === view);

  return (
    <div className="max-w-6xl">
      <h1 className="text-3xl font-bold tracking-tight">Bid board</h1>
      <p className="mt-2 text-ink-soft">Every invitation Bid Desk has read, with its first read on each. You make the call.</p>

      <div className="mt-6">
        <TapeRule bids={all} today={t} />
      </div>

      <nav aria-label="Filter bids" className="mt-8 flex flex-wrap gap-1 border-b border-rule">
        {VIEWS.map((v) => {
          const count = v.key === "all" ? all.length : all.filter((b) => b.decision === v.key).length;
          const active = v.key === view;
          return (
            <Link
              key={v.key}
              href={`/bids?view=${v.key}`}
              aria-current={active ? "page" : undefined}
              className={`-mb-px border-b-2 px-3 py-2 text-sm ${active ? "border-plan font-semibold text-ink" : "border-transparent text-ink-soft hover:text-ink"}`}
            >
              {v.label} <span className="text-ink-soft">{count}</span>
            </Link>
          );
        })}
      </nav>

      {shown.length === 0 && (
        <p className="py-10 text-ink-soft">
          Nothing here. {view === "pending" ? "Every invitation has a bid or no bid call." : "Make a call on an undecided bid and it shows up here."}
        </p>
      )}

      {group(shown, t).map((g) => (
        <section key={g.title} className="mt-8">
          <h2 className="text-sm font-semibold text-ink-soft">
            {g.title} <span className="font-normal">({g.bids.length})</span>
          </h2>
          <ul className="mt-2 divide-y divide-rule rounded-md border border-rule bg-panel">
            {g.bids.map((b) => {
              const due = formatDue(b.due, t);
              return (
                <li key={b.id}>
                  <Link href={`/bids/${b.id}`} className="grid gap-x-6 gap-y-2 px-4 py-4 hover:bg-paper md:grid-cols-[150px_1fr_200px_150px]">
                    <div>
                      <p className={`font-semibold ${due.late ? "text-stop" : ""}`}>{due.when}</p>
                      <p className="text-sm text-ink-soft">{due.date}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {b.projectName}
                        {b.packageName && <span className="font-normal text-ink-soft"> for {b.packageName.toLowerCase()}</span>}
                      </p>
                      <p className="truncate text-sm text-ink-soft">
                        {[b.gcName ?? b.requestedBy, b.location].filter(Boolean).join(", ")}
                      </p>
                      <div className="mt-2">
                        <ScopeChips scope={b.flooringScope} />
                      </div>
                    </div>
                    <div className="text-sm">
                      <RecommendationTag value={b.screen.recommendation} />
                      <p className="mt-1 text-ink-soft">{b.screen.reasons[0]}</p>
                    </div>
                    <div className="md:text-right">
                      <DecisionText value={b.decision} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
