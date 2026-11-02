import { connection } from "next/server";
import { saveProfile } from "@/app/team-actions";
import { AutonomySwitch } from "@/components/team/client";
import { BotAvatar } from "@/components/team/chat-screen";
import { getCompany } from "@/lib/data/store";
import { PROVIDERS, configured } from "@/lib/providers";
import { team } from "@/lib/team/store";
import { TRADES } from "@/lib/trades";

export const metadata = { title: "Settings" };
export const instant = false;

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-ink-soft">{hint}</span>}
    </label>
  );
}

const input = "h-10 rounded-[10px] bg-sunk px-3 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-lime-deep";

export default async function SettingsPage() {
  await connection();
  const s = team();
  const c = getCompany();

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <section className="card p-5 md:p-6">
        <h1 className="text-[22px] font-bold tracking-[-0.02em]">Settings</h1>
        <p className="mt-0.5 text-[12px] text-ink-soft">The company, the trade, and you. Every bot reads these.</p>
        <form action={saveProfile} className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Trade" hint="Sets what counts as your scope in an invitation, and the wording everywhere.">
            <select name="trade" defaultValue={c.trade} className={input}>
              {TRADES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Service area" hint="State codes, for example FL, GA">
            <input name="states" defaultValue={c.settings.serviceStates.join(", ")} className={input} />
          </Field>
          <Field label="Minimum lead time, in days">
            <input name="lead" type="number" min={0} max={59} defaultValue={c.settings.minLeadDays} className={input} />
          </Field>
          <Field label="Bids your team can price in a week">
            <input name="capacity" type="number" min={1} max={499} defaultValue={c.weeklyCapacity} className={input} />
          </Field>
          <Field label="Main bot's name">
            <input name="main_name" defaultValue={s.bots[0].name} className={input} />
          </Field>
          <Field label="Your name">
            <input name="you_name" defaultValue={s.you.name} className={input} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="A line about you" hint="Every bot uses this to know who it works for.">
              <textarea name="you_about" defaultValue={s.you.about} rows={2} className="rounded-[10px] bg-sunk px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-lime-deep" />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <button className="press h-10 cursor-pointer rounded-[10px] bg-ink px-5 text-[13px] font-semibold text-core hover:opacity-90">Save</button>
          </div>
        </form>
      </section>

      <div className="flex flex-col gap-4">
        <section className="card p-5 md:p-6">
          <h2 className="text-[15px] font-semibold">How each bot works</h2>
          <p className="mt-0.5 text-[12px] text-ink-soft">Asks first: every change waits for your OK. Just do it: changes inside the app run on their own; sending and paying still ask.</p>
          <ul className="mt-4 divide-y divide-hairline">
            {s.bots.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <BotAvatar id={b.id} size={28} />
                <span className="min-w-0 flex-1 text-[13px] font-semibold">{b.name}</span>
                <AutonomySwitch botId={b.id} value={b.autonomy} />
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-5 md:p-6">
          <h2 className="text-[15px] font-semibold">Services</h2>
          <p className="mt-0.5 text-[12px] text-ink-soft">Each turns on when its key is set on the server. Keys are never shown to a bot or sent to the browser.</p>
          <ul className="mt-4 divide-y divide-hairline">
            {PROVIDERS.map((p) => {
              const on = configured(p);
              return (
                <li key={p.key} className="flex items-start gap-3 py-3">
                  <span aria-hidden className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${on ? "bg-lime" : "bg-ghost"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-[13px] font-semibold">{p.name}</span>
                      <span className={`text-[11px] font-medium ${on ? "text-lime-deep" : "text-ink-soft"}`}>{on ? "On" : "Not set up"}</span>
                    </span>
                    <span className="block text-[12px] text-ink-soft">{p.does}</span>
                    {!on && <code className="mt-1 block text-[11px] text-ink-soft">{p.env.join(", ")}</code>}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
