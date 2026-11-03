"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { ArrowUp, Check, CopySimple, EnvelopeSimple, X } from "@phosphor-icons/react";
import { answerApproval, routeTo, saveAutonomy, sendMessage } from "@/app/team-actions";

/** Keeps the newest message in view as the thread grows. */
export function ScrollPin({ count }: { count: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "end" });
  }, [count]);
  return <div ref={ref} />;
}

export function Composer({ botId, botName, suggestions, initial, empty }: { botId: string; botName: string; suggestions: string[]; initial?: string; empty: boolean }) {
  const [draft, setDraft] = useState("");
  const [pending, start] = useTransition();
  const [sent, addSent] = useOptimistic<string[], string>([], (s, m) => [...s, m]);
  const fired = useRef(false);

  function send(text: string) {
    const clean = text.trim();
    if (!clean || pending) return;
    setDraft("");
    start(async () => {
      addSent(clean);
      await sendMessage(botId, clean);
    });
  }

  useEffect(() => {
    if (initial && !fired.current) {
      fired.current = true;
      send(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  return (
    <div>
      {sent.map((m, i) => (
        <div key={i} className="mb-3 flex flex-col items-end gap-2">
          <p className="max-w-[80%] rounded-[14px] rounded-br-[4px] bg-ink px-4 py-2.5 text-[13px] text-core">{m}</p>
        </div>
      ))}
      {pending && (
        <p className="mb-3 flex items-center gap-2 text-[12px] text-ink-soft" role="status">
          <span className="card-lime h-6 w-6 animate-pulse !rounded-full" aria-hidden />
          {botName} is on it
        </p>
      )}
      {empty && !pending && sent.length === 0 && (
        <ul className="mb-3 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <li key={s}>
              <button onClick={() => send(s)} className="press cursor-pointer rounded-[10px] bg-sunk px-3 py-2 text-left text-[12px] font-medium hover:bg-ghost">
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        className="flex items-end gap-2 rounded-[14px] bg-sunk p-2"
      >
        <label htmlFor="composer" className="sr-only">
          Message {botName}
        </label>
        <textarea
          id="composer"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(draft);
            }
          }}
          rows={1}
          placeholder={`Message ${botName}`}
          className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-2 py-2.5 text-[13px] outline-none placeholder:text-ink-soft"
        />
        <button type="submit" disabled={pending || !draft.trim()} aria-label="Send" className="press grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-[10px] bg-ink text-core hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30">
          <ArrowUp size={17} weight="bold" aria-hidden />
        </button>
      </form>
    </div>
  );
}

export function ApprovalButtons({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2">
      <button
        onClick={() => start(() => answerApproval(id, true))}
        disabled={pending}
        className="press flex h-8 cursor-pointer items-center gap-1.5 rounded-[8px] bg-ink px-3 text-[12px] font-semibold text-core hover:opacity-90 disabled:opacity-50"
      >
        <Check size={14} aria-hidden /> {pending ? "Working" : "Do it"}
      </button>
      <button
        onClick={() => start(() => answerApproval(id, false))}
        disabled={pending}
        className="press flex h-8 cursor-pointer items-center gap-1.5 rounded-[8px] px-3 text-[12px] font-medium text-ink-soft hover:bg-core hover:text-ink disabled:opacity-50"
      >
        <X size={14} aria-hidden /> Don&apos;t
      </button>
    </div>
  );
}

export function AutonomySwitch({ botId, value }: { botId: string; value: "ask" | "auto" }) {
  const [pending, start] = useTransition();
  const opts = [
    { key: "ask", label: "Asks first" },
    { key: "auto", label: "Just do it" },
  ] as const;
  return (
    <div role="radiogroup" aria-label="How this bot handles changes" className={`inline-flex rounded-[10px] bg-sunk p-0.5 ${pending ? "opacity-60" : ""}`}>
      {opts.map((o) => (
        <button
          key={o.key}
          role="radio"
          aria-checked={value === o.key}
          onClick={() => value !== o.key && start(() => saveAutonomy(botId, o.key))}
          className={`press h-8 cursor-pointer rounded-[8px] px-3 text-[12px] font-medium ${value === o.key ? "bg-core text-ink shadow-[0_1px_2px_rgb(0_0_0/0.08)]" : "text-ink-soft hover:text-ink"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function EmailDraft({ id, to, subject: s0, body: b0 }: { id: string; to?: string; subject: string; body: string }) {
  const [subject, setSubject] = useState(s0);
  const [body, setBody] = useState(b0);
  const [copied, setCopied] = useState(false);
  const mailto = `mailto:${to ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return (
    <div className="rounded-[12px] bg-sunk p-3">
      <p className="px-1 text-[11px] text-ink-soft">To {to ?? "add a recipient"}</p>
      <label className="sr-only" htmlFor={`s-${id}`}>
        Subject
      </label>
      <input id={`s-${id}`} value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1.5 h-9 w-full rounded-[8px] bg-core px-3 text-[13px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-lime-deep" />
      <label className="sr-only" htmlFor={`b-${id}`}>
        Body
      </label>
      <textarea id={`b-${id}`} value={body} onChange={(e) => setBody(e.target.value)} rows={Math.min(12, body.split("\n").length + 2)} className="mt-1.5 w-full resize-y rounded-[8px] bg-core px-3 py-2 text-[13px] leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-lime-deep" />
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

export function ChoiceButtons({ text, options }: { text: string; options: { to: string; label: string }[] }) {
  const [pending, start] = useTransition();
  const [picked, setPicked] = useState<string | null>(null);
  if (picked) return <p className="text-[12px] text-ink-soft">Sent to {picked}.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.to}
          disabled={pending}
          onClick={() =>
            start(async () => {
              await routeTo(text, o.to);
              setPicked(o.label);
            })
          }
          className="press h-8 cursor-pointer rounded-[8px] bg-sunk px-3 text-[12px] font-semibold hover:bg-ghost disabled:opacity-50"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
