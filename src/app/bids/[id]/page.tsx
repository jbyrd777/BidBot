import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { DecisionText, RecommendationTag, ScopeChips, formatDue } from "@/components/labels";
import { decide, getBid, today, type Decision } from "@/lib/data/store";

async function setDecision(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  const decision = String(formData.get("decision")) as Decision;
  if (!["bid", "no_bid", "pending"].includes(decision)) return;
  decide(id, decision);
  revalidatePath("/", "layout");
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-4 py-2.5">
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className="text-[15px]">{children}</dd>
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

  return (
    <div className="max-w-4xl">
      <Link href="/bids" className="text-sm text-plan underline underline-offset-2">
        Back to the bid board
      </Link>

      <header className="mt-4">
        <h1 className="text-3xl font-bold tracking-tight">{bid.projectName}</h1>
        <p className="mt-1 text-ink-soft">
          {bid.packageName ? `${bid.packageName} package for ` : ""}
          {bid.gcName ?? bid.requestedBy ?? "Unknown sender"}
        </p>
      </header>

      <section className="mt-6 grid gap-6 rounded-md border border-rule bg-panel p-5 md:grid-cols-[1fr_260px]">
        <div>
          <RecommendationTag value={bid.screen.recommendation} />
          <ul className="mt-3 space-y-1 text-[15px]">
            {bid.screen.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
        <form action={setDecision} className="flex flex-col gap-2 md:border-l md:border-rule md:pl-6">
          <input type="hidden" name="id" value={bid.id} />
          <p className="text-sm text-ink-soft">
            Your call: <DecisionText value={bid.decision} />
          </p>
          <button name="decision" value="bid" className="rounded bg-go px-4 py-2 font-semibold text-white hover:opacity-90">
            Bid this job
          </button>
          <button name="decision" value="no_bid" className="rounded border border-rule px-4 py-2 font-semibold hover:bg-paper">
            Pass on this job
          </button>
          {bid.decision !== "pending" && (
            <button name="decision" value="pending" className="text-sm text-ink-soft underline underline-offset-2">
              Undo my call
            </button>
          )}
        </form>
      </section>

      <dl className="mt-8 divide-y divide-rule border-y border-rule">
        <Row label="Bid due">
          <span className={due.late ? "font-semibold text-stop" : "font-semibold"}>{due.date}</span>
          <span className="text-ink-soft">, {due.when.toLowerCase()}</span>
        </Row>
        {bid.jobWalk && <Row label="Job walk">{short(bid.jobWalk)}</Row>}
        {bid.rfiDue && <Row label="Questions due">{short(bid.rfiDue)}</Row>}
        {bid.startDate && <Row label="Work starts">{short(bid.startDate)}</Row>}
        <Row label="Location">{bid.location ?? <span className="text-ink-soft">Not in the invitation</span>}</Row>
        {bid.projectSf && <Row label="Project size">{bid.projectSf.toLocaleString()} SF</Row>}
        <Row label="Flooring scope">
          <ScopeChips scope={bid.flooringScope} />
        </Row>
        {bid.contact && (
          <Row label="GC contact">
            {[bid.contact.name, bid.contact.title].filter(Boolean).join(", ")}
            {bid.contact.email && (
              <>
                <br />
                <a href={`mailto:${bid.contact.email}`} className="text-plan underline underline-offset-2">
                  {bid.contact.email}
                </a>
              </>
            )}
            {bid.contact.phone && <span className="text-ink-soft">, {bid.contact.phone}</span>}
          </Row>
        )}
        {bid.requestedBy && bid.gcName && <Row label="Sent to">{bid.requestedBy}</Row>}
        {bid.externalRef && <Row label="Reference">{bid.externalRef}</Row>}
        {bid.links.length > 0 && (
          <Row label="Plans and portal">
            <span className="flex flex-wrap gap-3">
              {bid.links.map((l) => (
                <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="text-plan underline underline-offset-2">
                  {l.label}
                </a>
              ))}
            </span>
          </Row>
        )}
      </dl>

      {(bid.description || bid.notes) && (
        <section className="mt-8 max-w-[70ch] space-y-3 text-[15px] leading-relaxed">
          <h2 className="text-lg font-semibold">From the invitation</h2>
          {bid.description && <p>{bid.description}</p>}
          {bid.notes && <p className="whitespace-pre-line text-ink-soft">{bid.notes}</p>}
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-semibold">History</h2>
        <ol className="mt-3 border-l-2 border-rule pl-5">
          {[...bid.events].reverse().map((e, i) => (
            <li key={i} className="relative pb-4">
              <span aria-hidden className={`absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-panel ${e.kind === "decision" ? "bg-plan" : e.kind === "update" ? "bg-chalk" : "bg-ink-soft"}`} />
              <p className="text-[15px]">{e.summary}</p>
              <p className="text-sm text-ink-soft">
                {new Date(e.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
