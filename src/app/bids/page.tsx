import { connection } from "next/server";
import Link from "next/link";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { Segmented } from "@/components/segmented";
import { DecisionText, GcMark, RecommendationTag, ScopeChips, formatDue } from "@/components/labels";
import { listBids, today, type Bid, type Decision } from "@/lib/data/store";
import { daysBetween } from "@/lib/itb/dates";

export const metadata = { title: "Bids" };

type View = Decision | "all";

const VIEWS: { key: View; label: string }[] = [
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

export default async function BidList({ searchParams }: PageProps<"/bids">) {
  const params = await searchParams;
  const view = VIEWS.find((v) => v.key === params.view)?.key ?? "pending";
  const q = typeof params.q === "string" ? params.q.trim().toLowerCase() : "";
  await connection();
  const all = listBids();
  const t = today();

  const matches = (b: Bid) => !q || [b.projectName, b.gcName, b.requestedBy, b.location].some((f) => f?.toLowerCase().includes(q));
  const shown = all.filter((b) => (view === "all" || b.decision === view) && matches(b));
  const href = (v: View) => `/bids?view=${v}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <section className="card p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.02em]">{q ? `Results for "${q}"` : "Bids"}</h1>
          <p className="mt-0.5 text-[12px] text-ink-soft">Every invitation Bid Desk has read, with its first read. Your team makes the call.</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
          <form action="/bids" role="search" className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-[10px] bg-sunk px-3 md:w-[220px] md:flex-none">
            <MagnifyingGlass size={15} className="shrink-0 text-ink-soft" aria-hidden />
            <label htmlFor="list-q" className="sr-only">
              Search bids
            </label>
            <input id="list-q" name="q" type="search" defaultValue={q} placeholder="Project, GC or city" className="min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-ink-soft" />
            <input type="hidden" name="view" value={view} />
          </form>
          <Segmented
            label="Filter bids"
            active={view}
            segments={VIEWS.map((v) => ({
              key: v.key,
              label: v.label,
              href: href(v.key),
              count: v.key === "all" ? all.length : all.filter((b) => b.decision === v.key).length,
            }))}
          />
        </div>
      </div>

      {shown.length === 0 && (
        <div className="mt-6 rounded-[10px] bg-sunk px-5 py-10 text-center">
          <p className="text-[14px] font-semibold">{q ? "No invitation matches that search" : view === "pending" ? "Every invitation has a call" : "Nothing here yet"}</p>
          <p className="mt-1 text-[12px] text-ink-soft">
            {q ? "Try a project name, a GC or a city." : view === "pending" ? "New invitations land here as Bid Desk reads them." : "Make a call on an undecided bid and it shows up here."}
          </p>
        </div>
      )}

      {shown.length > 0 && (
        <p className="mt-6 hidden grid-cols-[minmax(0,1fr)_150px_250px_90px] gap-x-6 border-b border-hairline px-2 pb-2 text-[11px] text-ink-soft md:grid">
          <span>Project</span>
          <span>Due</span>
          <span>First read</span>
          <span className="text-right">Call</span>
        </p>
      )}

      {group(shown, t).map((g) => (
        <div key={g.title} className="mt-4">
          <h2 className="px-2 text-[11px] font-semibold text-ink-soft">
            {g.title} ({g.bids.length})
          </h2>
          <ul className="mt-1">
            {g.bids.map((b) => {
              const due = formatDue(b.due, t);
              return (
                <li key={b.id}>
                  <Link href={`/bids/${b.id}`} className="press grid items-center gap-x-6 gap-y-1.5 rounded-[10px] px-2 py-3 hover:bg-sunk md:grid-cols-[minmax(0,1fr)_150px_250px_90px]">
                    <div className="flex min-w-0 items-center gap-3">
                      <GcMark name={b.gcName ?? b.requestedBy} />
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold">
                          {b.projectName}
                          {b.packageName && <span className="font-normal text-ink-soft"> for {b.packageName.toLowerCase()}</span>}
                        </p>
                        <p className="truncate text-[11px] text-ink-soft">{[b.gcName ?? b.requestedBy, b.location].filter(Boolean).join(", ")}</p>
                        <div className="mt-1">
                          <ScopeChips scope={b.flooringScope} />
                        </div>
                      </div>
                    </div>
                    <div className="pl-[52px] md:pl-0">
                      <p className={`text-[13px] font-semibold ${due.late ? "text-stop" : ""}`}>{due.when}</p>
                      <p className="text-[11px] text-ink-soft">{due.date}</p>
                    </div>
                    <div className="pl-[52px] md:pl-0">
                      <RecommendationTag value={b.screen.recommendation} />
                      <p className="mt-0.5 text-[11px] text-ink-soft">{b.screen.reasons[0]}</p>
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
  );
}
