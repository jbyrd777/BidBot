import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowSquareOut, Check, X, ArrowCounterClockwise } from "@phosphor-icons/react/dist/ssr";
import { DecisionText, GcMark, RecommendationTag, ScopeChips, formatDue } from "@/components/labels";
import { getBid, today, trade } from "@/lib/data/store";
import { setDecision } from "@/app/actions";

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[10px] bg-sunk p-4">
      <dt className="text-[12px] text-ink-soft">{label}</dt>
      <dd className="mt-1.5 text-[15px] font-semibold tracking-[-0.01em]">{children}</dd>
    </div>
  );
}

export const instant = false;

export default async function BidPage({ params }: PageProps<"/bids/[id]">) {
  const { id } = await params;
  await connection();
  const bid = getBid(id);
  if (!bid) notFound();
  const t = today();
  const due = formatDue(bid.due, t);
  const short = (d?: { date: string }) => (d ? formatDue({ date: d.date, raw: "" }, t).date : undefined);
  const sender = bid.gcName ?? bid.requestedBy ?? "Unknown sender";

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <Link href="/bids" className="press flex h-9 w-fit items-center gap-1.5 rounded-[10px] bg-core pl-3 pr-4 text-[13px] font-medium hover:bg-sunk">
        <ArrowLeft size={16} aria-hidden /> Bid board
      </Link>

      <div className="grid items-start gap-4 md:gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="card">
          <div className="p-5 md:p-7">
            <div className="flex items-start gap-4">
              <GcMark name={sender} size="lg" />
              <div className="min-w-0">
                <h1 className="text-[24px] font-bold leading-tight tracking-[-0.02em] md:text-[28px]">{bid.projectName}</h1>
                <p className="mt-1 text-[14px] text-ink-soft">
                  {bid.packageName ? `${bid.packageName} package for ` : ""}
                  {sender}
                </p>
              </div>
            </div>

            <dl className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Fact label="Bid due">
                <span className={due.late ? "text-stop" : ""}>{due.when}</span>
                <span className="block text-[12px] font-normal text-ink-soft">{due.date}</span>
              </Fact>
              <Fact label="Location">{bid.location ?? <span className="font-normal text-ink-soft">Not in the invitation</span>}</Fact>
              <Fact label="Project size">{bid.projectSf ? `${bid.projectSf.toLocaleString()} SF` : <span className="font-normal text-ink-soft">Not stated</span>}</Fact>
              {bid.jobWalk && <Fact label="Job walk">{short(bid.jobWalk)}</Fact>}
              {bid.rfiDue && <Fact label="Questions due">{short(bid.rfiDue)}</Fact>}
              {bid.startDate && <Fact label="Work starts">{short(bid.startDate)}</Fact>}
            </dl>

            <div className="mt-7">
              <h2 className="text-[14px] font-semibold">{trade().name} scope</h2>
              <div className="mt-2">
                <ScopeChips scope={bid.scope} />
              </div>
            </div>

            {(bid.description || bid.notes) && (
              <div className="mt-7 max-w-[68ch] space-y-3 text-[15px] leading-relaxed">
                <h2 className="text-[14px] font-semibold">From the invitation</h2>
                {bid.description && <p>{bid.description}</p>}
                {bid.notes && <p className="whitespace-pre-line text-ink-soft">{bid.notes}</p>}
              </div>
            )}
          </div>
        </section>

        <div className="flex flex-col gap-4 md:gap-5 xl:sticky xl:top-5">
          
          <section className="card p-5">
            <RecommendationTag value={bid.screen.recommendation} />
            <ul className="mt-3 space-y-1.5 text-[14px]">
              {bid.screen.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <form action={setDecision} className="mt-5 flex flex-col gap-2 border-t border-hairline pt-5">
              <input type="hidden" name="id" value={bid.id} />
              <p className="mb-1 flex items-center justify-between text-[13px] text-ink-soft">
                Your call <DecisionText value={bid.decision} />
              </p>
              <button name="decision" value="bid" className="press group flex cursor-pointer items-center justify-between rounded-[10px] bg-ink py-1.5 pl-4 pr-1.5 text-[14px] font-semibold text-core hover:opacity-90">
                Bid this job
                <span className="grid h-8 w-8 place-items-center rounded-[8px] fill-lime text-ink transition-transform duration-200 group-hover:translate-x-0.5">
                  <Check weight="bold" size={16} aria-hidden />
                </span>
              </button>
              <button name="decision" value="no_bid" className="press group flex cursor-pointer items-center justify-between rounded-[10px] bg-core py-1.5 pl-4 pr-1.5 text-[14px] font-semibold shadow-[inset_0_0_0_1px_var(--color-hairline)] hover:bg-sunk">
                Pass on this job
                <span className="grid h-8 w-8 place-items-center rounded-[8px] fill-ember transition-transform duration-200 group-hover:translate-x-0.5">
                  <X size={16} aria-hidden />
                </span>
              </button>
              {bid.decision !== "pending" && (
                <button name="decision" value="pending" className="mt-1 flex cursor-pointer items-center justify-center gap-1.5 text-[12px] font-medium text-ink-soft hover:text-ink">
                  <ArrowCounterClockwise size={14} aria-hidden /> Undo my call
                </button>
              )}
            </form>
          </section>

          <section className="card">
            <div className="p-5 text-[14px]">
              <h2 className="font-semibold">GC contact</h2>
              {bid.contact ? (
                <div className="mt-3 space-y-1">
                  <p className="font-medium">{[bid.contact.name, bid.contact.title].filter(Boolean).join(", ")}</p>
                  {bid.contact.email && (
                    <a href={`mailto:${bid.contact.email}`} className="block break-all underline decoration-hairline hover:decoration-ink">
                      {bid.contact.email}
                    </a>
                  )}
                  {bid.contact.phone && <p className="text-ink-soft">{bid.contact.phone}</p>}
                </div>
              ) : (
                <p className="mt-2 text-ink-soft">No contact in the invitation.</p>
              )}
              {(bid.requestedBy && bid.gcName) || bid.externalRef ? (
                <dl className="mt-4 space-y-1 border-t border-hairline pt-4 text-[13px] text-ink-soft">
                  {bid.requestedBy && bid.gcName && <div>Sent to {bid.requestedBy}</div>}
                  {bid.externalRef && <div>Reference {bid.externalRef}</div>}
                </dl>
              ) : null}
              {bid.links.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-hairline pt-4">
                  {bid.links.map((l) => (
                    <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="press flex items-center gap-1.5 rounded-[8px] bg-sunk py-1.5 pl-3 pr-2.5 text-[12px] font-semibold hover:bg-hairline">
                      Open {l.label} <ArrowSquareOut size={14} aria-hidden />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="card">
            <div className="p-5">
              <h2 className="text-[14px] font-semibold">History</h2>
              <ol className="mt-3 space-y-3">
                {[...bid.events].reverse().map((e, i) => (
                  <li key={i} className="flex gap-3">
                    <span aria-hidden className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${e.kind === "decision" ? "bg-ink" : e.kind === "update" ? "fill-sun" : "fill-lime"}`} />
                    <div>
                      <p className="text-[14px]">{e.summary}</p>
                      <p className="text-[12px] text-ink-soft">
                        {new Date(e.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
