import { connection } from "next/server";
import { addSamples, saveProfile } from "@/app/team-actions";
import { InviteForm } from "@/components/team/invite-form";
import { AutonomySwitch } from "@/components/team/client";
import { BotAvatar } from "@/components/team/chat-screen";
import { getCompany } from "@/packs/construction/store";
import { PROVIDERS, configured } from "@/lib/providers";
import { getWorkspace, teamMembers } from "@/lib/workspace/load";
import { CAN_MANAGE, ROLE_LABEL } from "@/lib/workspace/types";
import { TRADES } from "@/packs/construction/trades";

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
  const ws = await getWorkspace();
  const s = ws.team;
  const c = getCompany(ws);
  const manage = CAN_MANAGE.includes(ws.me.role);
  const people = await teamMembers(ws);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <section className="card p-5 md:p-6">
        <h1 className="text-[22px] font-bold tracking-[-0.02em]">Settings</h1>
        <p className="mt-0.5 text-[12px] text-ink-soft">The company, the trade, and you. Every bot reads these.</p>
        <form action={saveProfile} className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Company name">
              <input name="company" defaultValue={c.name} disabled={!manage} className={input} />
            </Field>
          </div>
          <Field label="Trade" hint="Sets what counts as your scope in an invitation, and the wording everywhere.">
            <select name="trade" defaultValue={c.trade} disabled={!manage} className={input}>
              {TRADES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Service area" hint="State codes, for example FL, GA">
            <input name="states" disabled={!manage} defaultValue={c.settings.serviceStates.join(", ")} className={input} />
          </Field>
          <Field label="Minimum lead time, in days">
            <input name="lead" disabled={!manage} type="number" min={0} max={59} defaultValue={c.settings.minLeadDays} className={input} />
          </Field>
          <Field label="Bids your team can price in a week">
            <input name="capacity" disabled={!manage} type="number" min={1} max={499} defaultValue={c.weeklyCapacity} className={input} />
          </Field>
          <Field label="Main bot's name">
            <input name="main_name" disabled={!manage} defaultValue={s.bots[0].name} className={input} />
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
          <h2 className="text-[15px] font-semibold">People</h2>
          <p className="mt-0.5 text-[12px] text-ink-soft">Everyone here talks to the same bot team. Roles decide who can make bid calls and approve what the bots want to do.</p>
          <ul className="mt-4 divide-y divide-hairline">
            {people.members.map((m) => (
              <li key={m.userId} className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
                <span className="font-semibold">
                  {m.name}
                  {m.userId === ws.me.userId && <span className="font-normal text-ink-soft"> (you)</span>}
                </span>
                <span className="text-[12px] text-ink-soft">{ROLE_LABEL[m.role]}</span>
              </li>
            ))}
            {people.invites.map((i) => (
              <li key={i.token} className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
                <span className="text-ink-soft">{i.email}</span>
                <span className="text-[12px] text-ink-soft">Invited as {ROLE_LABEL[i.role].toLowerCase()}</span>
              </li>
            ))}
          </ul>
          {manage && (
            <div className="mt-4">
              <InviteForm />
            </div>
          )}
        </section>

        {manage && (
          <section className="card p-5 md:p-6">
            <h2 className="text-[15px] font-semibold">Sample invitations</h2>
            <p className="mt-0.5 text-[12px] text-ink-soft">Load a set of real, anonymized invitations to try the team before your inbox is connected.</p>
            <form action={addSamples} className="mt-3">
              <button className="press h-9 cursor-pointer rounded-[10px] bg-sunk px-4 text-[13px] font-semibold hover:bg-ghost">Load sample invitations</button>
            </form>
          </section>
        )}

        <section className="card p-5 md:p-6">
          <h2 className="text-[15px] font-semibold">How each bot works</h2>
          <p className="mt-0.5 text-[12px] text-ink-soft">Asks first: every change waits for your OK. Just do it: changes inside the app run on their own; sending and paying still ask.</p>
          <ul className="mt-4 divide-y divide-hairline">
            {s.bots.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <BotAvatar id={b.id} name={b.name} size={28} />
                <span className="min-w-0 flex-1 text-[13px] font-semibold">{b.name}</span>
                {manage ? <AutonomySwitch botId={b.id} value={b.autonomy} /> : <span className="text-[12px] text-ink-soft">{b.autonomy === "auto" ? "Just do it" : "Asks first"}</span>}
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
