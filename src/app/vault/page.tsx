import { connection } from "next/server";
import Link from "next/link";
import { AccessChip } from "@/components/team/access-chip";
import { APP_GROUPS } from "@/lib/providers/apps";
import { providerOn } from "@/lib/providers";
import { team } from "@/lib/team/store";

export const metadata = { title: "Vault" };
export const instant = false;

export default async function VaultPage() {
  await connection();
  const ready = providerOn("apps");
  const bots = team().bots;
  return (
    <div className="flex flex-col gap-4">
      <section className="card p-5 md:p-6">
        <h1 className="text-[22px] font-bold tracking-[-0.02em]">Vault</h1>
        <p className="mt-0.5 max-w-[70ch] text-[12px] text-ink-soft">
          The apps your bots can use, and which bot may use each one. Reading runs on its own; sending, creating and paying ask you first. Passwords never reach a bot.
        </p>
        {!ready && (
          <p className="mt-4 rounded-[10px] bg-lime-wash px-3 py-2 text-[12px] text-lime-deep">
            Signing in to apps turns on when a connected apps key is added.{" "}
            <Link href="/settings" className="font-semibold hover:underline">
              Open Settings
            </Link>
            . You can set who gets access now; it applies once an app is connected.
          </p>
        )}
      </section>

      {APP_GROUPS.map((g) => (
        <section key={g.group} className="card p-5">
          <h2 className="text-[15px] font-semibold">{g.group}</h2>
          <ul className="mt-3 divide-y divide-hairline">
            {g.apps.map((a) => (
              <li key={a.key} className="flex flex-col gap-3 py-3 md:flex-row md:items-center">
                <div className="flex w-[220px] shrink-0 items-center gap-3">
                  <span aria-hidden className="grid h-9 w-9 place-items-center rounded-[10px] bg-sunk text-[12px] font-bold">
                    {a.name[0]}
                  </span>
                  <span>
                    <span className="block text-[13px] font-semibold">{a.name}</span>
                    <span className="block text-[11px] text-ink-soft">Not connected</span>
                  </span>
                </div>
                <div className="flex flex-1 flex-wrap gap-1.5" aria-label={`Bots that may use ${a.name}`}>
                  {bots.map((b) => (
                    <AccessChip key={b.id} botId={b.id} app={a.key} label={b.name} on={b.access.includes(a.key)} />
                  ))}
                </div>
                <button
                  disabled={!ready}
                  className="press h-8 shrink-0 cursor-pointer rounded-[8px] bg-ink px-3 text-[12px] font-semibold text-core hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
                  title={ready ? `Connect ${a.name}` : "Add a connected apps key in Settings first"}
                >
                  Connect
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
