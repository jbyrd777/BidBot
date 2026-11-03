import Link from "next/link";
import { connection } from "next/server";
import { acceptInvite } from "@/app/team-actions";
import { AuthShell, Notice, field, primary } from "@/components/auth-shell";
import { currentUser } from "@/lib/workspace/load";

export const metadata = { title: "Join your team" };
export const instant = false;

export default async function Invite({ params, searchParams }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const p = await searchParams;
  await connection();
  const user = await currentUser();
  const back = encodeURIComponent(`/invite/${token}`);

  if (!user) {
    return (
      <AuthShell title="You're invited" sub="Sign in or create an account with the email address the invite was sent to.">
        <div className="flex flex-col gap-2">
          <Link href={`/login?mode=signup&next=${back}`} className={`${primary} grid place-items-center`}>
            Create an account
          </Link>
          <Link href={`/login?next=${back}`} className="press grid h-11 place-items-center rounded-[10px] bg-sunk text-[14px] font-semibold hover:bg-ghost">
            I already have an account
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Join your team" sub={`Signed in as ${user.email}.`}>
      {typeof p.error === "string" && <Notice tone="error">{p.error}</Notice>}
      <form action={acceptInvite} className="flex flex-col gap-3">
        <input type="hidden" name="token" value={token} />
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium">Your name</span>
          <input name="you_name" required maxLength={80} autoComplete="name" className={field} />
        </label>
        <button className={`${primary} mt-1`}>Join workspace</button>
      </form>
    </AuthShell>
  );
}
