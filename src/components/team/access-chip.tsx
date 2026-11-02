"use client";

import { useTransition } from "react";
import { flipAccess } from "@/app/team-actions";

export function AccessChip({ botId, app, label, on }: { botId: string; app: string; label: string; on: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(() => flipAccess(botId, app))}
      aria-pressed={on}
      title={on ? `${label} may use this app` : `Let ${label} use this app`}
      className={`press h-7 cursor-pointer rounded-[8px] px-2 text-[11px] font-medium ${on ? "bg-ink text-core" : "bg-sunk text-ink-soft hover:text-ink"} ${pending ? "opacity-50" : ""}`}
    >
      {label}
    </button>
  );
}
