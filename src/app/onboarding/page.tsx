import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createWorkspace } from "@/app/team-actions";
import { AuthShell, field, primary } from "@/components/auth-shell";
import { dbConfigured } from "@/lib/supabase/env";
import { TRADES } from "@/lib/trades";
import { currentUser, myWorkspaces } from "@/lib/workspace/load";

export const metadata = { title: "Set up your workspace" };
export const instant = false;

export default async function Onboarding() {
  await connection();
  if (!dbConfigured()) redirect("/");
  const user = await currentUser();
  if (!user) redirect("/login");
  if ((await myWorkspaces()).length) redirect("/");

  return (
    <AuthShell title="Set up your company" sub="Your bot team starts working as soon as this is done. You can change any of it later in Settings.">
      <form action={createWorkspace} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium">Company name</span>
          <input name="company" required maxLength={120} className={field} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium">Your trade</span>
          <select name="trade" defaultValue="flooring" className={field}>
            {TRADES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium">Your name</span>
          <input name="you_name" required maxLength={80} autoComplete="name" className={field} />
        </label>
        <label className="mt-1 flex items-start gap-2.5 text-[13px]">
          <input type="checkbox" name="samples" defaultChecked className="mt-0.5 h-4 w-4 accent-[var(--color-lime-deep)]" />
          <span>
            Load sample invitations
            <span className="block text-[12px] text-ink-soft">So you can try the team before connecting your inbox.</span>
          </span>
        </label>
        <button className={`${primary} mt-2`}>Create workspace</button>
      </form>
    </AuthShell>
  );
}
