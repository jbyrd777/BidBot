import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { IconArrowLeft } from "@/components/icons";
import { DecisionText, GcMark, RecommendationTag, ScopeChips, formatDue } from "@/components/labels";
import { decide, getBid, today, type Decision } from "@/lib/data/store";

async function setDecision(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  const decision = String(formData.get("decision")) as Decision;
  if (!["bid", "no_bid", "pending"].includes(decision)) return;
  decide(id, decision);
  revalidatePath("/", "layout");
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-sunk p-4">
      <dt className="text-xs font-medium text-ink-soft">{label}</dt>
      <dd className="mt-1.5 text-[15px] font-semibold">{children}</dd>
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
    <div className="flex flex-col gap-3 md:gap-4">
      <Link href="/bids" className="flex w-fit items-center gap-1 px-1 pt-1 text-sm font-medium text-ink-soft hover:text-ink">
        <IconArrowLeft className="h-4 w-4" /> Bid board
      </Link>

      <div className="grid gap-3 md:gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="card p-5 md:p-7">
          <div className="flex items-start gap-4">
            <GcMark name={sender} />
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight md:text-[28px]">{bid.projectName}</h1>
              <p className="mt-1 text-sm text-ink-soft">
                {bid.packageName ? `${bid.packageName} package for ` : ""}
                {sender}
              </p>
            </div>
          </div>

          <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Fact label="Bid due">
              <span className={due.late ? "text-stop" : ""}>{due.when}</span>
              <span className="block text-xs font-normal text-ink-soft">{due.date}</span>
            </Fact>
            <Fact label="Location">{bid.location ?? <span className="font-normal text-ink-soft">Not in the invitation</span>}</Fact>
            <Fact label="Project size">{bid.projectSf ? `${bid.projectSf.toLocaleString()} SF` : <span className="font-normal text-ink-soft">Not stated</span>}</Fact>
            {bid.jobWalk && <Fact label="Job walk">{short(bid.jobWalk)}</Fact>}
            {bid.rfiDue && <Fact label="Questions due">{short(bid.rfiDue)}</Fact>}
            {bid.startDate && <Fact label="Work starts">{short(bid.startDate)}</Fact>}
          </dl>

          <div className="mt-6">
            <h2 className="text-sm font-semibold">Flooring scope</h2>
            <div className="mt-2">
              <ScopeChips scope={bid.flooringScope} />
            </div>
          </div>

          {(bid.description || bid.notes) && (
            <div className="mt-6 max-w-[70ch] space-y-3 text-[15px] leading-relaxed">
              <h2 className="text-sm font-semibold">From the invitation</h2>
              {bid.description && <p>{bid.description}</p>}
              {bid.notes && <p className="whitespace-pre-line text-ink-soft">{bid.notes}</p>}
            </div>
          )}
        </section>

        <div className="flex flex-col gap-3 md:gap-4">
          <section className="card p-5">
            <RecommendationTag value={bid.screen.recommendation} />
            <ul className="mt-3 space-y-1.5 text-sm">
              {bid.screen.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <form action={setDecision} className="mt-5 flex flex-col gap-2 border-t border-rule pt-5">
              <input type="hidden" name="id" value={bid.id} />
              <p className="mb-1 flex items-center justify-between text-sm text-ink-soft">
                Your call <DecisionText value={bid.decision} />
              </p>
              <button name="decision" value="bid" className="rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-panel hover:opacity-90">
                Bid this job
              </button>
              <button name="decision" value="no_bid" className="rounded-full bg-sunk px-4 py-2.5 text-sm font-semibold hover:brightness-95">
                Pass on this job
              </button>
              {bid.decision !== "pending" && (
                <button name="decision" value="pending" className="mt-1 text-xs font-medium text-ink-soft underline underline-offset-2">
                  Undo my call
                </button>
              )}
            </form>
          </section>

          <section className="card p-5 text-sm">
            <h2 className="font-semibold">GC contact</h2>
            {bid.contact ? (
              <div className="mt-3 space-y-1">
                <p className="font-medium">{[bid.contact.name, bid.contact.title].filter(Boolean).join(", ")}</p>
                {bid.contact.email && (
                  <a href={`mailto:${bid.contact.email}`} className="block break-all underline underline-offset-2">
                    {bid.contact.email}
                  </a>
                )}
                {bid.contact.phone && <p className="text-ink-soft">{bid.contact.phone}</p>}
              </div>
            ) : (
              <p className="mt-2 text-ink-soft">No contact in the invitation.</p>
            )}
            {(bid.requestedBy && bid.gcName) || bid.externalRef ? (
              <dl className="mt-4 space-y-1 border-t border-rule pt-4 text-ink-soft">
                {bid.requestedBy && bid.gcName && <div>Sent to {bid.requestedBy}</div>}
                {bid.externalRef && <div>Reference {bid.externalRef}</div>}
              </dl>
            ) : null}
            {bid.links.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-rule pt-4">
                {bid.links.map((l) => (
                  <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="rounded-full bg-sunk px-3 py-1.5 text-xs font-semibold hover:brightness-95">
                    Open {l.label}
                  </a>
                ))}
              </div>
            )}
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-semibold">History</h2>
            <ol className="mt-3 space-y-3">
              {[...bid.events].reverse().map((e, i) => (
                <li key={i} className="flex gap-3">
                  <span aria-hidden className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${e.kind === "decision" ? "bg-ink" : e.kind === "update" ? "bg-sun" : "bg-lime"}`} />
                  <div>
                    <p className="text-sm">{e.summary}</p>
                    <p className="text-xs text-ink-soft">
                      {new Date(e.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
