import Link from "next/link";
import { connection } from "next/server";
import { resetPassword, signIn, signUp } from "@/app/auth-actions";
import { AuthShell, Notice, field, primary } from "@/components/auth-shell";

export const metadata = { title: "Sign in" };
export const instant = false;

export default async function Login({ searchParams }: PageProps<"/login">) {
  const p = await searchParams;
  await connection();
  const mode = p.mode === "signup" ? "signup" : p.mode === "reset" ? "reset" : "signin";
  const next = typeof p.next === "string" ? p.next : "/";
  const q = (m: string) => `/login?mode=${m}${next !== "/" ? `&next=${encodeURIComponent(next)}` : ""}`;

  if (typeof p.sent === "string") {
    return (
      <AuthShell title="Check your email" sub={`We sent a link to ${p.sent}. Open it on this device to finish.`}>
        <Link href="/login" className="text-[13px] font-semibold hover:underline">
          Back to sign in
        </Link>
      </AuthShell>
    );
  }

  const copy = {
    signin: { title: "Sign in", sub: "Your bot team is waiting.", action: signIn, cta: "Sign in" },
    signup: { title: "Create your account", sub: "Then set up your company's workspace in under a minute.", action: signUp, cta: "Create account" },
    reset: { title: "Reset your password", sub: "We'll email you a link to set a new one.", action: resetPassword, cta: "Send reset link" },
  }[mode];

  return (
    <AuthShell title={copy.title} sub={copy.sub}>
      {typeof p.error === "string" && <Notice tone="error">{p.error}</Notice>}
      <form action={copy.action} className="flex flex-col gap-3">
        <input type="hidden" name="next" value={next} />
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium">Work email</span>
          <input name="email" type="email" required autoComplete="email" className={field} />
        </label>
        {mode !== "reset" && (
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium">Password</span>
            <input name="password" type="password" required minLength={mode === "signup" ? 10 : undefined} autoComplete={mode === "signup" ? "new-password" : "current-password"} className={field} />
            {mode === "signup" && <span className="text-[11px] text-ink-soft">At least 10 characters.</span>}
          </label>
        )}
        <button className={`${primary} mt-1`}>{copy.cta}</button>
      </form>
      <div className="mt-5 flex flex-wrap justify-between gap-2 text-[13px]">
        {mode === "signin" ? (
          <>
            <Link href={q("signup")} className="font-semibold hover:underline">
              Create an account
            </Link>
            <Link href={q("reset")} className="text-ink-soft hover:text-ink hover:underline">
              Forgot password
            </Link>
          </>
        ) : (
          <Link href={q("signin")} className="font-semibold hover:underline">
            I already have an account
          </Link>
        )}
      </div>
    </AuthShell>
  );
}
