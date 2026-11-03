import Link from "next/link";
import { ArrowRight, Desktop } from "@phosphor-icons/react/dist/ssr";
import { REC_STYLE } from "@/components/labels";
import type { BidCard } from "@/lib/agent/types";
import { botName, getBot, thread, waiting } from "@/lib/team/store";
import type { Workspace } from "@/lib/workspace/types";
import type { Approval, BotId, Block } from "@/lib/team/types";
import { ApprovalButtons, AutonomySwitch, Composer, EmailDraft, ScrollPin } from "./client";

export function initials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export function BotAvatar({ id, name, size = 28 }: { id: BotId | "user"; name: string; size?: number }) {
  const main = id === "chief";
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full font-semibold ${main ? "card-lime !rounded-full" : id === "user" ? "bg-ink text-core" : "bg-sunk text-ink"}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {initials(name)}
    </span>
  );
}

function BidRow({ b }: { b: BidCard }) {
  const r = REC_STYLE[b.recommendation];
  return (
    <Link href={`/bids/${b.id}`} className="press flex items-center gap-3 rounded-[10px] px-2 py-2 hover:bg-core">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] bg-core text-[11px] font-semibold">{initials(b.gc ?? "?")}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold">{b.projectName}</span>
        <span className="flex items-center gap-1.5 truncate text-[11px] text-ink-soft">
          <span className={`h-2 w-2 shrink-0 rounded-[2px] ${r.fill}`} aria-hidden />
          {r.text}
          {b.gc ? `, ${b.gc}` : ""}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className={`block text-[12px] font-semibold ${b.late ? "text-stop" : ""}`}>{b.dueWhen}</span>
        <span className="block text-[10px] text-ink-soft">{b.decision === "pending" ? "Undecided" : b.decision === "bid" ? "Bidding" : "Not bidding"}</span>
      </span>
    </Link>
  );
}

export function ApprovalCard({ ws, a, compact }: { ws: Workspace; a: Approval; compact?: boolean }) {
  return (
    <div className="rounded-[12px] bg-sunk p-3">
      <p className="flex items-center gap-2 text-[11px] text-ink-soft">
        <BotAvatar id={a.botId} name={botName(ws, a.botId)} size={18} />
        {botName(ws, a.botId)} {a.status === "waiting" ? "is waiting for your OK" : ""}
      </p>
      <p className={`mt-1.5 font-semibold ${compact ? "text-[12px]" : "text-[13px]"}`}>{a.summary}</p>
      <div className="mt-2">
        {a.status === "waiting" ? (
          <ApprovalButtons id={a.id} />
        ) : (
          <p className={`text-[12px] font-medium ${a.status === "done" ? "text-lime-deep" : "text-ink-soft"}`} role="status">
            {a.status === "done" ? "Done" : "Declined"}: {a.result}
          </p>
        )}
      </div>
    </div>
  );
}

function BlockView({ ws, b }: { ws: Workspace; b: Block }) {
  switch (b.type) {
    case "bids":
      return (
        <div className="rounded-[12px] bg-sunk p-1.5">
          <p className="px-2 pb-0.5 pt-1 text-[11px] text-ink-soft">
            {b.title} ({b.bids.length})
          </p>
          {b.bids.slice(0, 8).map((x) => (
            <BidRow key={x.id} b={x} />
          ))}
          {b.bids.length > 8 && (
            <Link href="/bids?view=all" className="block px-2 py-1.5 text-[12px] font-semibold hover:underline">
              {b.bids.length - 8} more on the board
            </Link>
          )}
        </div>
      );
    case "approval": {
      const a = ws.team.approvals.find((x) => x.id === b.approvalId);
      return a ? <ApprovalCard ws={ws} a={a} /> : null;
    }
    case "email":
      return <EmailDraft id={`${b.bid.id}-${b.subject.length}`} to={b.to} subject={b.subject} body={b.body} />;
    case "doc":
      return (
        <div className="rounded-[12px] bg-sunk p-4">
          <p className="text-[14px] font-bold">{b.title}</p>
          {b.sections.map((s) => (
            <div key={s.heading} className="mt-3">
              <p className="text-[11px] font-semibold text-ink-soft">{s.heading}</p>
              <ul className="mt-1 space-y-0.5 text-[13px]">
                {s.lines.filter(Boolean).map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      );
    case "checklist":
      return (
        <div className="rounded-[12px] bg-sunk p-4">
          <p className="text-[14px] font-bold">{b.title}</p>
          <ul className="mt-2 space-y-1.5 text-[13px]">
            {b.items.map((i) => (
              <li key={i} className="flex items-start gap-2">
                <span aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-[4px] border border-ink/25 bg-core" />
                {i}
              </li>
            ))}
          </ul>
        </div>
      );
    case "notice":
      return (
        <p className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[10px] px-3 py-2 text-[12px] ${b.tone === "warn" ? "bg-ember/15 text-ember-deep" : "bg-lime-wash text-lime-deep"}`}>
          {b.text}
          {b.href && (
            <Link href={b.href} className="inline-flex items-center gap-1 font-semibold underline-offset-2 hover:underline">
              {b.cta} <ArrowRight size={11} weight="bold" aria-hidden />
            </Link>
          )}
        </p>
      );
    case "confirm":
      return null;
    case "handoff":
      return null;
  }
}

const SUGGEST: Record<string, string[]> = {
  chief: ["What's due this week?", "What's waiting for my OK?", "Pass on the ones outside our area", "Scope snapshot for Gunster", "Remember that we never bid Washington work"],
  bid_desk: ["What's waiting on a call?", "Show the ones outside our area", "Tell me about Raising Cane's"],
  scope_analyst: ["Scope snapshot for the Guess job", "Scope for Christian Bros Auto"],
  takeoff_coordinator: ["Queue the takeoff for Immokalee FHA"],
  vendor_rfq: ["Draft an RFQ for Immokalee FHA"],
  proposal_builder: ["Outline a proposal for Christian Bros Auto"],
  gc_follow_up: ["Draft an email to Pinnacle asking for plans"],
  submittals: ["Submittal checklist for Immokalee FHA"],
};

export function ChatScreen({ ws, botId, initial }: { ws: Workspace; botId: BotId; initial?: string }) {
  const bot = getBot(ws, botId)!;
  const t = thread(ws, botId);
  const w = waiting(ws);
  const tasks = ws.team.tasks.filter((x) => x.status === "open").slice(-5).reverse();

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <section className="card flex min-w-0 flex-col p-4 md:p-5" style={{ minHeight: "calc(100dvh - 132px)" }}>
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <BotAvatar id={botId} name={bot.name} size={40} />
            <div className="min-w-0">
              <h1 className="text-[17px] font-bold tracking-[-0.01em]">{bot.name}</h1>
              <p className="truncate text-[12px] text-ink-soft">{bot.role}</p>
            </div>
          </div>
          <AutonomySwitch botId={botId} value={bot.autonomy} />
        </header>

        <ol className="flex flex-1 flex-col gap-5 py-5">
          {t.messages.length === 0 && (
            <li className="mt-auto">
              <p className="text-[22px] font-bold leading-tight tracking-[-0.02em]">{botId === "chief" ? "What do you need done?" : `What should ${bot.name} work on?`}</p>
              <p className="mt-1.5 max-w-[56ch] text-[13px] text-ink-soft">
                {botId === "chief"
                  ? "Ask for anything across the bid cycle. I hand it to the right bot and report back here. Reading happens right away; changes and anything that goes out wait for your OK."
                  : `${bot.role}. Reading happens right away; changes wait for your OK.`}
              </p>
            </li>
          )}
          {t.messages.map((m) =>
            m.from === "user" ? (
              <li key={m.id} className="ml-auto max-w-[80%] rounded-[14px] rounded-br-[4px] bg-ink px-4 py-2.5 text-[13px] text-core">
                {m.text}
              </li>
            ) : m.blocks.length === 1 && m.blocks[0].type === "handoff" && !m.text ? (
              <li key={m.id} className="flex items-center gap-2 text-[11px] text-ink-soft">
                <BotAvatar id={m.from} name={botName(ws, m.from)} size={18} />
                <span>{m.blocks[0].note}</span>
                <span className="h-px flex-1 bg-hairline" />
              </li>
            ) : (
              <li key={m.id} className="max-w-[660px]">
                <p className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold">
                  <BotAvatar id={m.from} name={botName(ws, m.from)} size={22} />
                  {botName(ws, m.from)}
                </p>
                {m.text && <p className="whitespace-pre-line text-[13px] leading-relaxed">{m.text}</p>}
                {m.blocks.length > 0 && (
                  <div className="mt-2.5 flex flex-col gap-2">
                    {m.blocks.map((b, i) => (
                      <BlockView key={i} ws={ws} b={b} />
                    ))}
                  </div>
                )}
              </li>
            ),
          )}
        </ol>

        <div className="sticky bottom-0 bg-core pt-2">
          <Composer botId={botId} botName={bot.name} suggestions={SUGGEST[botId] ?? []} initial={initial} empty={t.messages.length === 0} />
          <ScrollPin count={t.messages.length} />
        </div>
      </section>

      <aside className="flex flex-col gap-4">
        <section className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Waiting for your OK</h2>
            {w.length > 0 && <span className="grid h-6 min-w-6 place-items-center rounded-full bg-ink px-2 text-[11px] font-semibold text-core">{w.length}</span>}
          </div>
          {w.length ? (
            <div className="mt-3 flex flex-col gap-2">
              {w.slice(0, 4).map((a) => (
                <ApprovalCard key={a.id} ws={ws} a={a} compact />
              ))}
              {w.length > 4 && (
                <Link href="/waiting" className="text-[12px] font-semibold hover:underline">
                  See all {w.length}
                </Link>
              )}
            </div>
          ) : (
            <p className="mt-2 text-[12px] text-ink-soft">Nothing right now. When a bot wants to change something or send it, it shows up here.</p>
          )}
        </section>

        <section className="card p-5">
          <h2 className="text-[15px] font-semibold">Tasks</h2>
          {tasks.length ? (
            <ul className="mt-3 space-y-2 text-[12px]">
              {tasks.map((x) => (
                <li key={x.id} className="flex items-start gap-2">
                  <span aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-[4px] border border-ink/25" />
                  <span>
                    <span className="block font-medium">{x.title}</span>
                    <span className="text-ink-soft">
                      {x.owner}
                      {x.due ? `, due ${x.due.slice(5).replace("-", ".")}` : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[12px] text-ink-soft">No open tasks. Ask any bot to add one.</p>
          )}
        </section>

        <section className="card p-5">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold">
            <Desktop size={17} aria-hidden /> Computer
          </h2>
          <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
            Each bot can work on its own cloud computer, with live screens you can watch or take over. Add a computer provider key in Settings to turn it on.
          </p>
          <Link href="/settings" className="press mt-3 inline-flex h-8 items-center rounded-[8px] bg-sunk px-3 text-[12px] font-semibold hover:bg-ghost">
            Open Settings
          </Link>
        </section>
      </aside>
    </div>
  );
}
