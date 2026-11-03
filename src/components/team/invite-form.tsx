"use client";

import { useActionState, useState } from "react";
import { CopySimple } from "@phosphor-icons/react";
import { inviteMember } from "@/app/team-actions";

const ROLES = [
  ["estimator", "Estimator"],
  ["sales", "Sales"],
  ["project_manager", "Project manager"],
  ["admin", "Admin"],
  ["viewer", "Viewer"],
] as const;

export function InviteForm() {
  const [state, action, pending] = useActionState(async (_: unknown, fd: FormData) => inviteMember(fd), null as { link?: string; error?: string } | null);
  const [copied, setCopied] = useState(false);
  const full = state?.link && typeof window !== "undefined" ? `${window.location.origin}${state.link}` : state?.link;
  return (
    <div>
      <form action={action} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="inv-email" className="sr-only">
          Email
        </label>
        <input id="inv-email" name="email" type="email" required placeholder="teammate@company.com" className="h-10 min-w-0 flex-1 rounded-[10px] bg-sunk px-3 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-lime-deep" />
        <label htmlFor="inv-role" className="sr-only">
          Role
        </label>
        <select id="inv-role" name="role" defaultValue="estimator" className="h-10 rounded-[10px] bg-sunk px-3 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-lime-deep">
          {ROLES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <button disabled={pending} className="press h-10 cursor-pointer rounded-[10px] bg-ink px-4 text-[13px] font-semibold text-core hover:opacity-90 disabled:opacity-50">
          {pending ? "Inviting" : "Invite"}
        </button>
      </form>
      {state?.error && (
        <p role="alert" className="mt-2 text-[12px] text-ember-deep">
          {state.error}
        </p>
      )}
      {full && (
        <div className="mt-3 rounded-[10px] bg-lime-wash p-3 text-[12px] text-lime-deep" role="status">
          <p className="font-semibold">Invite ready. Send them this link:</p>
          <div className="mt-1.5 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-[6px] bg-core px-2 py-1 text-ink">{full}</code>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(full);
                  setCopied(true);
                } catch {}
              }}
              className="press flex h-7 cursor-pointer items-center gap-1 rounded-[6px] bg-core px-2 font-medium text-ink"
            >
              <CopySimple size={13} aria-hidden /> {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
