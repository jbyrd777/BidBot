import { connection } from "next/server";
import Link from "next/link";
import { ArrowUpRight, Check, X, FolderOpen, EnvelopeSimple, DotsThree, CaretRight, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { setDecision } from "@/app/actions";
import { DueChart } from "@/components/due-chart";
import { Gauge } from "@/components/gauge";
import { Segmented } from "@/components/segmented";
import { GcMark, REC_STYLE, formatDue } from "@/components/labels";
import { getCompany, listBids, today, trade, type Bid } from "@/lib/data/store";
import { daysBetween } from "@/lib/itb/dates";
import {
  PLATFORM_LABEL,
  dueByDay,
  receivedWithin,
  recentActivity,
  scopeMix,
  serviceAreaFit,
  shortDate,
  timeUsed,
  topSenders,
  weekday,
} from "@/lib/dashboard";

export const metadata = { title: "Dashboard" };
export const instant = false;

const SCOPE_COLORS = ["#f6a65c", "#f5c64e", "#f0e14a", "#c9e58e", "#9fd04e", "#5f9e25"];
const DEC = { pending: { text: "Undecided", cls: "text-ink-soft" }, bid: { text: "Bidding", cls: "text-lime-deep" }, no_bid: { text: "Not bidding", cls: "text-ember-deep" } };

function CardHead({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {sub && <p className="text-[11px] text-ink-soft">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

function SmallButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="press flex h-8 shrink-0 items-center gap-1 rounded-[8px] border border-hairline px-2.5 text-[12px] font-medium hover:bg-sunk">
      {children}
    </Link>
  );
}

function Delta({ tone, children }: { tone: "up" | "warn" | "plain"; children: React.ReactNode }) {
  const cls = tone === "up" ? "text-lime-deep" : tone === "warn" ? "text-ember-deep" : "text-ink-soft";
  return (
    <p className="mt-1 flex items-center gap-1 text-[11px] text-ink-soft">
      {tone !== "plain" && <ArrowUpRight size={12} weight="bold" className={cls} aria-hidden />}
      <span className={tone === "plain" ? "" : `font-semibold ${cls}`}>{children}</span>
    </p>
  );
}

function QuickAction({ label, icon, href, form }: { label: string; icon: React.ReactNode; href?: string; form?: { id: string; decision: string } }) {
  const box = "press grid h-12 w-12 place-items-center rounded-[10px] border border-hairline bg-core hover:bg-sunk";
  const inner = form ? (
    <form action={setDecision}>
      <input type="hidden" name="id" value={form.id} />
      <button name="decision" value={form.decision} className={`${box} cursor-pointer`} aria-label={label}>
        {icon}
      </button>
    </form>
  ) : href ? (
    <a href={href} className={box} aria-label={label} {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>
      {icon}
    </a>
  ) : (
    <span className={`${box} cursor-not-allowed opacity-40`} aria-disabled="true" aria-label={`${label}, not in the invitation`}>
      {icon}
    </span>
  );
  return (
    <div className="flex flex-col items-center gap-1.5">
      {inner}
      <span className="text-[11px] text-ink-soft">{label}</span>
    </div>
  );
}

export default async function Dashboard({ searchParams }: PageProps<"/dashboard">) {
  const params = await searchParams;
  await connection();
  const company = getCompany();
  const all = listBids();
  const t = today();

  const span = params.range === "14" ? 14 : 7;
  const days = dueByDay(all, t, span);
  const busiest = days.reduce((a, d) => (d.total > a.total ? d : a), days[0]);
  const selected = typeof params.day === "string" && days.some((d) => d.iso === params.day) ? params.day : busiest.iso;
  const openInWindow = days.reduce((n, d) => n + d.total, 0);
  const hrefFor = (o: { day?: string; range?: number }) => `/dashboard?range=${o.range ?? span}${o.day ? `&day=${o.day}` : ""}`;

  const pending = all.filter((b) => b.decision === "pending");
  const urgent = pending.filter((b) => b.due && daysBetween(t, b.due.date) >= 0 && daysBetween(t, b.due.date) < 3).length;
  const bidding = all.filter((b) => b.decision === "bid").length;
  const decided = all.filter((b) => b.decision !== "pending").length;
  const newThisWeek = receivedWithin(all, t, 7);

  const dueThisWeek = all.filter((b) => b.due && b.decision !== "no_bid" && daysBetween(t, b.due.date) >= 0 && daysBetween(t, b.due.date) < 7);
  const cap = company.weeklyCapacity;
  const scale = Math.max(cap, dueThisWeek.length);
  const over = Math.max(0, dueThisWeek.length - cap);

  const busiestBids = all.filter((b) => b.decision !== "no_bid" && b.due?.date === busiest.iso);
  const needLook = busiestBids.filter((b) => b.screen.recommendation === "review").length;

  const scope = scopeMix(all);
  const fit = serviceAreaFit(all, company);
  const firstRead = all.reduce((m, b) => (b.receivedAt < m ? b.receivedAt : m), all[0]?.receivedAt ?? t);

  const upcoming = all
    .filter((b) => b.decision !== "no_bid" && b.due && daysBetween(t, b.due.date) >= 0)
    .sort((a, b) => (a.due!.date + (a.due!.time ?? "")).localeCompare(b.due!.date + (b.due!.time ?? "")));
  const [next, after] = upcoming.filter((b) => b.decision === "pending");
  const tracker = { week: upcoming.filter((b) => daysBetween(t, b.due!.date) < 7).slice(0, 3), later: upcoming.filter((b) => daysBetween(t, b.due!.date) >= 7).slice(0, 2) };

  const senders = topSenders(all, 5);
  const activity = recentActivity(all, 7);

  function TrackRow({ b }: { b: Bid }) {
    const left = daysBetween(t, b.due!.date);
    const used = timeUsed(b, t);
    return (
      <li>
        <Link href={`/bids/${b.id}`} className="press flex items-center gap-3 rounded-[10px] py-1.5 hover:bg-sunk/70">
          <GcMark name={b.gcName ?? b.requestedBy} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="flex items-baseline justify-between gap-2 text-[12px]">
              <span className="truncate font-semibold">{b.projectName}</span>
              <span className="shrink-0 text-ink-soft">{weekday(b.due!.date)} {shortDate(b.due!.date)}</span>
            </p>
            <span className="mt-1 block h-2 overflow-hidden rounded-full bg-sunk">
              <span className={`block h-full rounded-full ${left <= 1 ? "fill-ember" : "fill-lime"}`} style={{ width: `${Math.max(6, used * 100)}%` }} />
            </span>
            <p className="mt-0.5 text-[10px] text-ink-soft">{left === 0 ? "Due today" : `${left} day${left === 1 ? "" : "s"} left`}</p>
          </div>
        </Link>
      </li>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex min-w-0 flex-col gap-4">
        {/* Row 1: the due chart and the stat column */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_200px]">
          <section className="card min-w-0 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[34px] font-bold leading-none tracking-[-0.03em]">{openInWindow}</p>
                <p className="mt-1.5 text-[12px] text-ink-soft">Open bids due in the next {span} days</p>
              </div>
              <div className="flex flex-col items-end gap-3">
                <Segmented
                  label="Chart range"
                  active={String(span)}
                  segments={[
                    { key: "7", label: "7d", href: hrefFor({ range: 7 }) },
                    { key: "14", label: "14d", href: hrefFor({ range: 14 }) },
                  ]}
                />
                <ul className="flex flex-wrap justify-end gap-3 text-[11px]">
                  {(["bid", "review", "no_bid"] as const).map((r) => (
                    <li key={r} className="flex items-center gap-1.5">
                      <span className={`h-2.5 w-2.5 rounded-[3px] ${REC_STYLE[r].fill}`} aria-hidden />
                      {REC_STYLE[r].text}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="-mx-1 overflow-x-auto px-1">
              <div className="min-w-[420px]">
                <DueChart days={days} selected={selected} hrefFor={(iso) => hrefFor({ day: iso })} />
              </div>
            </div>
          </section>

          <section className="card grid grid-cols-3 gap-4 p-5 md:grid-cols-1 md:content-between" aria-label="Totals">
            <div>
              <p className="text-[12px] text-ink-soft">Invitations read</p>
              <p className="mt-1 text-[26px] font-bold leading-none tracking-[-0.02em]">{all.length}</p>
              <Delta tone={newThisWeek ? "up" : "plain"}>{newThisWeek} new this week</Delta>
            </div>
            <div>
              <p className="text-[12px] text-ink-soft">Waiting on you</p>
              <p className="mt-1 text-[26px] font-bold leading-none tracking-[-0.02em]">{pending.length}</p>
              <Delta tone={urgent ? "warn" : "plain"}>{urgent ? `${urgent} due within 3 days` : "None due within 3 days"}</Delta>
            </div>
            <div>
              <p className="text-[12px] text-ink-soft">Bidding</p>
              <p className="mt-1 text-[26px] font-bold leading-none tracking-[-0.02em]">{bidding}</p>
              <Delta tone="plain">{decided ? `${Math.round((bidding / decided) * 100)}% of calls made` : "No calls made yet"}</Delta>
            </div>
          </section>
        </div>

        {/* Row 2: weekly load and the tip */}
        <div className="grid gap-4 md:grid-cols-2">
          <section className="card p-5">
            <CardHead title="Weekly bid load" sub="Open bids due this week against your capacity" />
            <div className="mt-6 flex h-6 gap-1 overflow-hidden rounded-[6px] bg-sunk" role="img" aria-label={`${dueThisWeek.length} due this week, capacity ${cap}`}>
              <span className="fill-lime rounded-[6px]" style={{ width: `${(Math.min(dueThisWeek.length, cap) / scale) * 100}%` }} />
              {over > 0 && <span className="fill-ember rounded-[6px]" style={{ width: `${(over / scale) * 100}%` }} />}
            </div>
            <p className="mt-2 flex justify-between text-[11px] text-ink-soft">
              <span>
                <span className="font-semibold text-ink">{dueThisWeek.length} due</span>
                {over > 0 && <span className="text-ember-deep">, {over} over capacity</span>}
              </span>
              <span>Capacity {cap}</span>
            </p>
          </section>

          <section className="card relative overflow-hidden p-5">
            <div className="relative z-10 max-w-[62%]">
              <h2 className="text-[15px] font-semibold leading-snug">
                {busiest.total > 1 ? `${busiest.total} bids close ${weekday(busiest.iso, "long")}` : "No pile up on a single day this week"}
              </h2>
              <p className="mt-1.5 text-[12px] leading-snug text-ink-soft">
                {busiest.total > 1
                  ? needLook
                    ? `${needLook} of them still need a look. Ask those GCs for plans today so the calls can be made in time.`
                    : "Make the bid or pass calls early so takeoffs can start."
                  : "Due dates are spread out. Work the board in date order."}
              </p>
              <Link href={busiest.total > 1 ? hrefFor({ day: busiest.iso }) : "/bids"} className="press mt-4 inline-flex items-center gap-1 text-[12px] font-semibold hover:opacity-70">
                {busiest.total > 1 ? "Show that day" : "Open the board"} <CaretRight size={12} weight="bold" aria-hidden />
              </Link>
            </div>
            <div aria-hidden className="absolute bottom-3 right-3 flex items-end gap-1">
              {[1, 2, 3, 4].map((h, i) => (
                <div key={h} className="flex flex-col gap-1">
                  {Array.from({ length: h }, (_, k) => (
                    <span key={k} className="h-6 w-6 rounded-[4px] fill-lime" style={{ opacity: 0.35 + i * 0.18 - k * 0.05 }} />
                  ))}
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Row 3: scope mix, service area fit, coming up */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <section className="card p-5">
            <CardHead title="Scope mix" sub={`${trade().name} scope named in the invitations`} />
            <p className="mt-4 text-[30px] font-bold leading-none tracking-[-0.03em]">
              {scope.named}
              <span className="ml-1.5 text-[13px] font-medium tracking-normal text-ink-soft">of {all.length} name their scope</span>
            </p>
            <div className="mt-4 flex h-5 gap-[3px]" role="img" aria-label={scope.rows.map((r) => `${r.label} ${r.pct}%`).join(", ")}>
              {scope.rows.map((r, i) => (
                <span
                  key={r.label}
                  className={`rounded-[4px] ${r.label === "Not stated" ? "fill-ghost" : "hatch"}`}
                  style={{ flexGrow: r.count, backgroundColor: r.label === "Not stated" ? undefined : SCOPE_COLORS[i % SCOPE_COLORS.length] }}
                />
              ))}
            </div>
            <ul className="mt-4 space-y-1.5 text-[12px]">
              {scope.rows.map((r, i) => (
                <li key={r.label} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-[3px] ${r.label === "Not stated" ? "fill-ghost" : ""}`} style={{ backgroundColor: r.label === "Not stated" ? undefined : SCOPE_COLORS[i % SCOPE_COLORS.length] }} aria-hidden />
                    {r.label}
                  </span>
                  <span className="font-medium">{r.pct}%</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card flex flex-col p-5">
            <CardHead title="Service area fit" sub={`Invitations in ${company.settings.serviceStates.join(", ")}`} />
            <p className="mt-4 text-[30px] font-bold leading-none tracking-[-0.03em]">
              {fit.inside}
              <span className="ml-1.5 text-[13px] font-medium tracking-normal text-ink-soft">inside, {fit.known - fit.inside} outside</span>
            </p>
            <div className="mt-4">
              <Gauge value={all.length ? fit.inside / all.length : 0} label="of invitations are in your area" />
            </div>
            <p className="mt-auto pt-4 text-[11px] leading-snug text-ink-soft">
              Based on {all.length} invitations read since {shortDate(firstRead.slice(0, 10))}
              {fit.unknown ? `. ${fit.unknown} had no location.` : "."}
            </p>
          </section>

          <section className="card p-5 md:col-span-2 xl:col-span-1">
            <CardHead title="Coming up">
              <SmallButton href="/bids?view=all">All bids</SmallButton>
            </CardHead>
            {tracker.week.length > 0 && (
              <>
                <h3 className="mt-4 text-[11px] text-ink-soft">This week</h3>
                <ul className="mt-1">
                  {tracker.week.map((b) => (
                    <TrackRow key={b.id} b={b} />
                  ))}
                </ul>
              </>
            )}
            {tracker.later.length > 0 && (
              <>
                <h3 className="mt-3 text-[11px] text-ink-soft">Later</h3>
                <ul className="mt-1">
                  {tracker.later.map((b) => (
                    <TrackRow key={b.id} b={b} />
                  ))}
                </ul>
              </>
            )}
            {!upcoming.length && <p className="mt-4 text-[12px] text-ink-soft">Nothing due ahead. New invitations land here as they arrive.</p>}
          </section>
        </div>
      </div>

      {/* Right rail */}
      <aside className="flex flex-col gap-4">
        <section className="card p-5">
          <CardHead title="Next due" sub="Soonest undecided bid">
            <SmallButton href="/bids">Board</SmallButton>
          </CardHead>

          {next ? (
            <>
              <div className="mt-4 flex gap-2 overflow-hidden">
                <Link href={`/bids/${next.id}`} className="card-lime press flex h-[150px] w-[84%] shrink-0 flex-col p-4">
                  <span className="flex items-center justify-between text-[11px] font-medium">
                    <span>{formatDue(next.due, t).when}</span>
                    <span className="font-bold italic">{PLATFORM_LABEL[next.platform]}</span>
                  </span>
                  <span className="mt-3 line-clamp-2 text-[16px] font-bold leading-snug">{next.projectName}</span>
                  <span className="mt-auto flex items-end justify-between gap-2 text-[11px]">
                    <span className="truncate">{next.gcName ?? next.requestedBy}</span>
                    <span className="shrink-0 font-semibold">
                      {shortDate(next.due!.date)}
                      {next.due!.time ? ` ${formatDue(next.due, t).date.split(" ").slice(3).join(" ")}` : ""}
                    </span>
                  </span>
                </Link>
                {after && (
                  <Link href={`/bids/${after.id}`} className="press flex h-[150px] w-[84%] shrink-0 flex-col rounded-[14px] bg-sunk p-4" aria-label={`Then ${after.projectName}`}>
                    <span className="text-[11px] text-ink-soft">{formatDue(after.due, t).when}</span>
                    <span className="mt-3 line-clamp-2 text-[14px] font-semibold">{after.projectName}</span>
                  </Link>
                )}
              </div>

              <div className="mt-4 flex justify-between">
                <QuickAction label="Bid" icon={<Check size={18} aria-hidden />} form={{ id: next.id, decision: "bid" }} />
                <QuickAction label="Pass" icon={<X size={18} aria-hidden />} form={{ id: next.id, decision: "no_bid" }} />
                <QuickAction label="Plans" icon={<FolderOpen size={18} aria-hidden />} href={next.links[0]?.url} />
                <QuickAction label="Email GC" icon={<EnvelopeSimple size={18} aria-hidden />} href={next.contact?.email ? `mailto:${next.contact.email}` : undefined} />
                <QuickAction label="Details" icon={<DotsThree size={18} weight="bold" aria-hidden />} href={`/bids/${next.id}`} />
              </div>
            </>
          ) : (
            <p className="mt-4 text-[12px] text-ink-soft">Every open bid has a call.</p>
          )}

          {senders.length > 0 && (
            <div className="mt-6">
              <h3 className="text-[13px] font-semibold">Who sends the most</h3>
              <ul className="mt-3 flex justify-between gap-1">
                {senders.map((s, i) => (
                  <li key={s.name} className="min-w-0 flex-1">
                    <Link href={`/bids?view=all&q=${encodeURIComponent(s.name)}`} className="press flex flex-col items-center gap-1.5" title={`${s.name}, ${s.count} invitations`}>
                      <span className={`grid h-11 w-11 place-items-center rounded-full text-[12px] font-semibold ${i === 0 ? "card-lime !rounded-full" : "bg-sunk"}`}>
                        {s.name.replace(/[^A-Za-z ]/g, "").split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                      </span>
                      <span className="w-full truncate text-center text-[11px]">{s.name.split(/[ ,]/)[0]}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="card p-5">
          <CardHead title="Recent activity" />
          <p className="mt-3 flex justify-between border-b border-hairline pb-2 text-[11px] text-ink-soft">
            <span>Event</span>
            <span>Call</span>
          </p>
          <ul>
            {activity.map((e, i) => (
              <li key={i}>
                <Link href={`/bids/${e.bid.id}`} className="press flex items-center gap-3 py-2 hover:bg-sunk/60">
                  <GcMark name={e.bid.gcName ?? e.bid.requestedBy} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-semibold">{e.bid.projectName}</span>
                    <span className="block truncate text-[11px] text-ink-soft">
                      {shortDate(e.at.slice(0, 10))} {e.kind === "update" ? "Update" : e.kind === "decision" ? "Call made" : "Invitation"}
                    </span>
                  </span>
                  <span className={`shrink-0 text-[11px] font-medium ${DEC[e.bid.decision].cls}`}>{DEC[e.bid.decision].text}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/bids?view=all" className="press mt-2 flex items-center justify-center gap-1 rounded-[8px] py-2 text-[12px] font-semibold hover:bg-sunk">
            All invitations <ArrowRight size={12} weight="bold" aria-hidden />
          </Link>
        </section>
      </aside>
    </div>
  );
}
