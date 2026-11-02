"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUp, Check, CopySimple, EnvelopeSimple, X } from "@phosphor-icons/react";
import { setDecision } from "@/app/actions";
import type { BidCard, Block, ChatReply, ChatTurn } from "@/lib/agent/types";
import { REC_STYLE } from "./labels";

type Msg = { role: "user"; text: string } | ({ role: "assistant" } & ChatReply);

function initials(name?: string) {
  return (name ?? "?").replace(/[^A-Za-z ]/g, "").split(" ").filter((w) => w && !/^(inc|llc|co|the|of|and)$/i.test(w)).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
}

function BidRow({ b }: { b: BidCard }) {
  const r = REC_STYLE[b.recommendation];
  return (
    <Link href={`/bids/${b.id}`} className="press flex items-center gap-3 rounded-[10px] px-2 py-2 hover:bg-core">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] bg-core text-[11px] font-semibold">{initials(b.gc)}</span>
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

function ConfirmCard({ block }: { block: Extract<Block, { type: "confirm" }> }) {
  const router = useRouter();
  const [state, setState] = useState<"open" | "done" | "skipped">(block.bid.decision === block.decision ? "done" : "open");
  const [pending, start] = useTransition();
  const label = block.decision === "bid" ? "Mark as bidding" : "Mark as passing";
  const doneText = block.decision === "bid" ? "Marked as bidding" : "Marked as not bidding";

  function confirm() {
    const fd = new FormData();
    fd.set("id", block.bid.id);
    fd.set("decision", block.decision);
    start(async () => {
      await setDecision(fd);
      setState("done");
      router.refresh();
    });
  }

  return (
    <div className="rounded-[12px] bg-sunk p-3">
      <BidRow b={block.bid} />
      {block.why && <p className="px-2 pt-1 text-[11px] text-ink-soft">{block.why}</p>}
      <div className="mt-2 flex items-center gap-2 px-2 pb-1">
        {state === "open" && (
          <>
            <button onClick={confirm} disabled={pending} className="press flex h-8 cursor-pointer items-center gap-1.5 rounded-[8px] bg-ink px-3 text-[12px] font-semibold text-core hover:opacity-90 disabled:opacity-50">
              {block.decision === "bid" ? <Check size={14} aria-hidden /> : <X size={14} aria-hidden />}
              {pending ? "Saving" : label}
            </button>
            <button onClick={() => setState("skipped")} className="press h-8 cursor-pointer rounded-[8px] px-3 text-[12px] font-medium text-ink-soft hover:bg-core hover:text-ink">
              Not now
            </button>
          </>
        )}
        {state === "done" && (
          <p className="flex items-center gap-1.5 text-[12px] font-semibold text-lime-deep" role="status">
            <Check size={14} weight="bold" aria-hidden /> {doneText}
          </p>
        )}
        {state === "skipped" && <p className="text-[12px] text-ink-soft">Left undecided</p>}
      </div>
    </div>
  );
}

function EmailCard({ block }: { block: Extract<Block, { type: "email" }> }) {
  const [subject, setSubject] = useState(block.subject);
  const [body, setBody] = useState(block.body);
  const [copied, setCopied] = useState(false);
  const mailto = `mailto:${block.to ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return (
    <div className="rounded-[12px] bg-sunk p-3">
      <p className="px-1 text-[11px] text-ink-soft">To {block.to ?? "the GC (no address in the invitation)"}</p>
      <label className="sr-only" htmlFor={`subj-${block.bid.id}`}>
        Subject
      </label>
      <input
        id={`subj-${block.bid.id}`}
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        className="mt-1.5 h-9 w-full rounded-[8px] bg-core px-3 text-[13px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-lime-deep"
      />
      <label className="sr-only" htmlFor={`body-${block.bid.id}`}>
        Email body
      </label>
      <textarea
        id={`body-${block.bid.id}`}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={Math.min(12, body.split("\n").length + 2)}
        className="mt-1.5 w-full resize-y rounded-[8px] bg-core px-3 py-2 text-[13px] leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-lime-deep"
      />
      <div className="mt-1.5 flex flex-wrap gap-2">
        <a href={mailto} className="press flex h-8 items-center gap-1.5 rounded-[8px] bg-ink px-3 text-[12px] font-semibold text-core hover:opacity-90">
          <EnvelopeSimple size={14} aria-hidden /> Open in mail
        </a>
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(`${subject}\n\n${body}`);
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            } catch {}
          }}
          className="press flex h-8 cursor-pointer items-center gap-1.5 rounded-[8px] bg-core px-3 text-[12px] font-medium hover:bg-ghost"
        >
          <CopySimple size={14} aria-hidden /> {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="mt-2.5 flex flex-col gap-2">
      {blocks.map((b, i) =>
        b.type === "bids" ? (
          <div key={i} className="rounded-[12px] bg-sunk p-1.5">
            <p className="px-2 pb-0.5 pt-1 text-[11px] text-ink-soft">
              {b.title} ({b.bids.length})
            </p>
            {b.bids.slice(0, 8).map((bid) => (
              <BidRow key={bid.id} b={bid} />
            ))}
            {b.bids.length > 8 && (
              <Link href="/bids?view=all" className="block px-2 py-1.5 text-[12px] font-semibold hover:underline">
                {b.bids.length - 8} more on the board
              </Link>
            )}
          </div>
        ) : b.type === "confirm" ? (
          <ConfirmCard key={i} block={b} />
        ) : (
          <EmailCard key={i} block={b} />
        ),
      )}
    </div>
  );
}

export function Chat({ suggestions, initial }: { suggestions: string[]; initial?: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [msgs, busy]);

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || busy) return;
    const next: Msg[] = [...msgs, { role: "user", text: clean }];
    setMsgs(next);
    setDraft("");
    setBusy(true);
    setError("");
    try {
      const history: ChatTurn[] = next.map((m) => ({ role: m.role, text: m.text }));
      const res = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ history }) });
      if (!res.ok) throw new Error();
      const reply = (await res.json()) as ChatReply;
      setMsgs((m) => [...m, { role: "assistant", ...reply }]);
    } catch {
      setError("That message did not go through. Check the connection and send it again.");
      setMsgs(msgs);
      setDraft(clean);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (initial && !sentInitial.current) {
      sentInitial.current = true;
      void send(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  return (
    <div className="flex h-[calc(100dvh-148px)] min-h-[520px] flex-col lg:h-[calc(100dvh-132px)]">
      <div className="min-h-0 flex-1 overflow-y-auto px-1" aria-live="polite">
        {msgs.length === 0 && (
          <div className="flex h-full flex-col items-start justify-end gap-3 pb-2">
            <p className="text-[24px] font-bold leading-tight tracking-[-0.02em]">What do you need on the bids?</p>
            <p className="max-w-[52ch] text-[13px] text-ink-soft">Ask about what is due, what is waiting on a call, or any bid by name. Calls and emails come back for you to confirm; nothing changes or goes out on its own.</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <li key={s}>
                  <button onClick={() => send(s)} className="press cursor-pointer rounded-[10px] bg-sunk px-3 py-2 text-left text-[12px] font-medium hover:bg-ghost">
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <ol className="flex flex-col gap-5 py-2">
          {msgs.map((m, i) =>
            m.role === "user" ? (
              <li key={i} className="ml-auto max-w-[80%] rounded-[14px] rounded-br-[4px] bg-ink px-4 py-2.5 text-[13px] text-core">
                {m.text}
              </li>
            ) : (
              <li key={i} className="max-w-[640px]">
                <p className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold">
                  <span className="card-lime grid h-6 w-6 place-items-center !rounded-full text-[9px]">{initials(m.from)}</span>
                  {m.from}
                </p>
                <p className="whitespace-pre-line text-[13px] leading-relaxed">{m.text}</p>
                {m.blocks.length > 0 && <Blocks blocks={m.blocks} />}
              </li>
            ),
          )}
          {busy && (
            <li className="flex items-center gap-2 text-[12px] text-ink-soft" role="status">
              <span className="card-lime h-6 w-6 animate-pulse !rounded-full" aria-hidden />
              Checking the board
            </li>
          )}
        </ol>
        <div ref={end} />
      </div>

      {error && <p className="px-1 pb-2 text-[12px] text-stop" role="alert">{error}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(draft);
        }}
        className="flex items-end gap-2 rounded-[14px] bg-sunk p-2"
      >
        <label htmlFor="chat-input" className="sr-only">
          Message
        </label>
        <textarea
          id="chat-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(draft);
            }
          }}
          rows={1}
          placeholder="Ask about a bid, or tell me what to do"
          className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-2 py-2.5 text-[13px] outline-none placeholder:text-ink-soft"
        />
        <button type="submit" disabled={busy || !draft.trim()} aria-label="Send" className="press grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-[10px] bg-ink text-core hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30">
          <ArrowUp size={17} weight="bold" aria-hidden />
        </button>
      </form>
    </div>
  );
}
