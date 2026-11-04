"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowClockwise, Desktop, X } from "@phosphor-icons/react";
import { closeComputer, openComputer, retryComputerJob } from "@/app/team-actions";

/** Refreshes the page every few seconds while the computer has work in flight, so progress shows up. */
export function JobWatch({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(t);
  }, [active, router]);
  return null;
}

export function RetryJob({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(() => retryComputerJob(id))}
      disabled={pending}
      className="press inline-flex h-7 cursor-pointer items-center gap-1 rounded-[8px] bg-sunk px-2.5 text-[11px] font-semibold hover:bg-ghost disabled:opacity-50"
    >
      <ArrowClockwise size={12} aria-hidden /> {pending ? "Queuing" : "Try again"}
    </button>
  );
}

/** The live screen. Everything typed here goes to the computer, so a person can sign in to sites themselves. */
function Screen({ url, password, onClose }: { url: string; password: string; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"connecting" | "connected" | "lost">("connecting");
  useEffect(() => {
    let rfb: import("@novnc/novnc").default | undefined;
    let gone = false;
    import("@novnc/novnc").then(({ default: RFB }) => {
      if (gone || !box.current) return;
      const r = new RFB(box.current, `${url}?token=${encodeURIComponent(password)}`);
      r.scaleViewport = true;
      r.resizeSession = false;
      r.addEventListener("connect", () => setState("connected"));
      r.addEventListener("disconnect", () => setState("lost"));
      rfb = r;
    });
    return () => {
      gone = true;
      rfb?.disconnect();
    };
  }, [url, password]);

  return (
    <div role="dialog" aria-modal="true" aria-label="The computer" className="fixed inset-0 z-40 flex flex-col bg-ink/80 p-3 md:p-6">
      <div className="mb-3 flex items-center justify-between gap-3 text-core">
        <p className="text-[13px]">
          {state === "connecting" ? "Connecting to the computer" : state === "lost" ? "The connection closed. Close this and open the computer again." : "You are in control. Sign in to sites yourself; the bots never type passwords."}
        </p>
        <button onClick={onClose} className="press inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-[8px] bg-core px-3 text-[12px] font-semibold text-ink">
          <X size={14} aria-hidden /> Close the computer
        </button>
      </div>
      <div ref={box} className="min-h-0 flex-1 overflow-hidden rounded-[12px] bg-ink" />
    </div>
  );
}

export function ComputerControls({ canOpen, on }: { canOpen: boolean; on: boolean }) {
  const [view, setView] = useState<{ url: string; password: string }>();
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const open = () =>
    start(async () => {
      setError(undefined);
      const r = await openComputer();
      if (r.error || !r.url || !r.password) setError(r.error ?? "The computer did not open.");
      else setView({ url: r.url, password: r.password });
    });
  const close = () =>
    start(async () => {
      setView(undefined);
      await closeComputer();
    });

  if (!canOpen) return <p className="mt-3 text-[12px] text-ink-soft">Owners and admins can open the computer to watch it or sign in to sites.</p>;
  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={open}
          disabled={pending}
          className="press inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[8px] bg-ink px-3 text-[12px] font-semibold text-core hover:opacity-90 disabled:opacity-50"
        >
          <Desktop size={14} aria-hidden /> {pending && !view ? "Starting" : "Open the computer"}
        </button>
        {on && !view && (
          <button onClick={close} disabled={pending} className="press inline-flex h-8 cursor-pointer items-center rounded-[8px] px-3 text-[12px] font-medium text-ink-soft hover:bg-sunk hover:text-ink disabled:opacity-50">
            Turn it off
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-[12px] text-ember-deep">
          {error}
        </p>
      )}
      {view && <Screen {...view} onClose={close} />}
    </div>
  );
}
