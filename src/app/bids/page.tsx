import { connection } from "next/server";
import Link from "next/link";
import { CalendarBlank, CheckCircle, Clock, Tray, ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { GlassSegmented } from "@/components/glass-segmented";
import { DecisionText, GcMark, RecommendationTag, ScopeChips, formatDue } from "@/components/labels";
import { TapeRule } from "@/components/tape-rule";
import { listBids, today, type Bid, type Decision } from "@/lib/data/store";
import { daysBetween } from "@/lib/itb/dates";

type View = Decision | "all" | "week" | "fit";

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

function StatPlate({ href, icon, label, value, note, active }: { href: string; icon: React.ReactNode; label: string; value: number; note: string; active: boolean }) {
  return (
    <Link href={href} scroll={false} aria-current={active ? "page" : undefined} className="bezel press group block">
      <div className={`core flex h-full flex-col p-4 md:p-5 ${active ? "!shadow-[inset_0_0_0_2px_var(--color-lime-deep)]" : ""}`}>
        <span className="flex items-center justify-between gap-2 text-[13px] text-ink-soft">
          <span className="flex items-center gap-2">
            <span className="hidden h-8 w-8 place-items-center rounded-full bg-sunk text-ink md:grid">{icon}</span>
            {label}
          </span>
          <ArrowUpRight weight="light" size={16} className="hidden shrink-0 transition-transform duration-200 group-hover:-translate-y-px group-hover:translate-x-px sm:block" aria-hidden />
        </span>
        <span className="mt-auto block pt-4 text-[34px] font-semibold leading-none tracking-[-0.03em] tabular-nums md:pt-6 md:text-[40px]">{value}</span>
        <span className="mt-2 hidden text-[12px] text-ink-soft md:block">{note}</span>
      </div>
    </Link>
  );
}

export const instant = false;

export default async function BidBoard({ searchParams }: PageProps<"/bids">) {
  const params = await searchParams;
  const keys: View[] = ["pending", "bid", "no_bid", "all", "week", "fit"];
  const view = keys.find((k) => k === params.view) ?? "pending";
  const q = typeof params.q === "string" ? params.q.trim().toLowerCase() : "";
  await connection();
  const all = listBids();
  const t = today();

  const dueThisWeek = (b: Bid) => !!b.due && b.decision !== "no_bid" && daysBetween(t, b.due.date) >= 0 && daysBetween(t, b.due.date) < 7;
  const fits = (b: Bid) => b.decision === "pending" && b.screen.recommendation === "bid";
  const matches = (b: Bid) => !q || [b.projectName, b.gcName, b.requestedBy, b.location].some((f) => f?.toLowerCase().includes(q));
  const inView = (b: Bid) => (view === "all" ? true : view === "week" ? dueThisWeek(b) : view === "fit" ? fits(b) : b.decision === view);
  const shown = all.filter((b) => inView(b) && matches(b));

  const waiting = all.filter((b) => b.decision === "pending").length;
  const href = (v: View) => `/bids?view=${v}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
  const title = q ? `Results for "${q}"` : view === "week" ? "Due this week" : view === "fit" ? "Look like a bid" : "Invitations";

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <section className="grid grid-cols-3 gap-3 md:gap-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="bezel col-span-3 lg:col-span-1">
          <div className="core-lime flex h-full flex-col p-6 md:p-7">
            <h1 className="text-[30px] font-semibold leading-[1.05] tracking-[-0.02em] md:text-[34px]">Bid board</h1>
            <p className="mt-2 max-w-[34ch] text-[14px] text-ink/70">Every invitation Bid Desk has read, with a first read on each. Your team makes the call.</p>
            <Link href={href("pending")} scroll={false} className="press group mt-auto flex items-end gap-3 pt-8">
              <span className="text-[56px] font-semibold leading-[0.85] tracking-[-0.04em] tabular-nums">{waiting}</span>
              <span className="pb-0.5 text-[14px] font-medium leading-snug">
                waiting on you
                <span className="block text-ink/60">of {all.length} read</span>
              </span>
              <span className="mb-1 ml-auto grid h-9 w-9 place-items-center rounded-full bg-ink/10 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                <Tray weight="light" size={18} aria-hidden />
              </span>
            </Link>
          </div>
        </div>
        <StatPlate href={href("week")} active={view === "week"} icon={<Clock weight="light" size={17} />} label="Due this week" value={all.filter(dueThisWeek).length} note="Not counting passes" />
        <StatPlate href={href("fit")} active={view === "fit"} icon={<CheckCircle weight="light" size={17} />} label="Look like a bid" value={all.filter(fits).length} note="Fit your rules, still undecided" />
        <StatPlate href={href("bid")} active={view === "bid"} icon={<CalendarBlank weight="light" size={17} />} label="Bidding" value={all.filter((b) => b.decision === "bid").length} note="Marked by your team" />
      </section>

      <TapeRule bids={all} today={t} />

      <section className="bezel">
        <div className="core p-3 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 px-2 pt-1">
            <h2 className="text-[19px] font-semibold">{title}</h2>
            <GlassSegmented
                id="board"
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

          {shown.length === 0 && (
            <div className="mx-2 mt-4 rounded-[16px] bg-sunk px-5 py-10 text-center">
              <p className="text-[15px] font-medium">{q ? "No invitation matches that search" : view === "pending" ? "Every invitation has a call" : "Nothing here yet"}</p>
              <p className="mt-1 text-[13px] text-ink-soft">
                {q ? "Try a project name, a GC or a city." : view === "pending" ? "New invitations land here as Bid Desk reads them." : "Make a call on an undecided bid and it shows up here."}
              </p>
            </div>
          )}

          {group(shown, t).map((g) => (
            <div key={g.title} className="mt-5">
              <h3 className="px-2 text-[12px] font-medium text-ink-soft">
                {g.title} ({g.bids.length})
              </h3>
              <ul className="mt-1.5">
                {g.bids.map((b) => {
                  const due = formatDue(b.due, t);
                  return (
                    <li key={b.id}>
                      <Link href={`/bids/${b.id}`} className="press grid items-center gap-x-6 gap-y-2 rounded-[18px] px-2 py-3 hover:bg-sunk md:grid-cols-[minmax(0,1fr)_150px_230px_96px]">
                        <div className="flex min-w-0 items-center gap-3.5">
                          <GcMark name={b.gcName ?? b.requestedBy} />
                          <div className="min-w-0">
                            <p className="truncate text-[15px] font-semibold tracking-[-0.01em]">
                              {b.projectName}
                              {b.packageName && <span className="font-normal text-ink-soft"> for {b.packageName.toLowerCase()}</span>}
                            </p>
                            <p className="truncate text-[12px] text-ink-soft">{[b.gcName ?? b.requestedBy, b.location].filter(Boolean).join(", ")}</p>
                            <div className="mt-1.5">
                              <ScopeChips scope={b.flooringScope} />
                            </div>
                          </div>
                        </div>
                        <div className="pl-[58px] md:pl-0">
                          <p className={`text-[14px] font-semibold ${due.late ? "text-stop" : ""}`}>{due.when}</p>
                          <p className="text-[12px] text-ink-soft">{due.date}</p>
                        </div>
                        <div className="pl-[58px] md:pl-0">
                          <RecommendationTag value={b.screen.recommendation} />
                          <p className="mt-0.5 text-[12px] text-ink-soft">{b.screen.reasons[0]}</p>
                        </div>
                        <div className="pl-[58px] md:pl-0 md:text-right">
                          <DecisionText value={b.decision} />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
