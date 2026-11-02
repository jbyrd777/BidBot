import { connection } from "next/server";
import { Chat } from "@/components/chat";
import { DEFAULT_ROSTER } from "@/lib/bots/roster";
import { modelEnabled } from "@/lib/agent/model";
import { weekSummary } from "@/lib/agent/ops";

export const metadata = { title: "Chat" };
export const instant = false;

const STATUS = { live: "Working", review: "In review mode", off: "Not set up yet" } as const;

export default async function ChatPage({ searchParams }: PageProps<"/chat">) {
  const params = await searchParams;
  await connection();
  const { urgent } = weekSummary();
  const first = urgent[0];
  const suggestions = [
    "What's due this week?",
    "What's waiting on a call?",
    "Show the ones outside our area",
    first ? `Draft an email to ${first.gcName ?? first.requestedBy} asking for plans on ${first.projectName}` : "Give me a summary",
    "Pass on the ones outside our area",
  ];

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <section className="card min-w-0 p-4 md:p-6">
        <Chat suggestions={suggestions} initial={typeof params.q === "string" ? params.q : undefined} />
      </section>

      <aside className="hidden flex-col gap-4 xl:flex">
        <section className="card p-5">
          <h2 className="text-[15px] font-semibold">The team</h2>
          <p className="text-[11px] text-ink-soft">Each bot owns one part of the bid cycle</p>
          <ul className="mt-4 flex flex-col gap-3">
            {DEFAULT_ROSTER.map((b) => (
              <li key={b.kind} className="flex items-center gap-3">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-semibold ${b.status === "live" ? "card-lime !rounded-full" : "bg-sunk text-ink-soft"}`}>
                  {b.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold">{b.name}</span>
                  <span className="block text-[11px] text-ink-soft">{STATUS[b.status]}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="card p-5 text-[12px] leading-relaxed text-ink-soft">
          <h2 className="text-[15px] font-semibold text-ink">How this works</h2>
          <p className="mt-2">Answers come from your board. A bid or pass call shows up as a card you confirm. Emails show up as drafts you edit and send from your own mail.</p>
          <p className="mt-2">{modelEnabled() ? "Full conversation mode is on." : "Running on built in answers for everyday questions. Connect a language model key to hold a full conversation."}</p>
        </section>
      </aside>
    </div>
  );
}
