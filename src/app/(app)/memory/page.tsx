import { connection } from "next/server";
import { addFact, removeFact } from "@/app/team-actions";
import { botName } from "@/lib/team/store";
import { getWorkspace } from "@/lib/workspace/load";

export const metadata = { title: "Memory" };
export const instant = false;

export default async function MemoryPage() {
  await connection();
  const ws = await getWorkspace();
  const s = ws.team;
  return (
    <section className="card max-w-3xl p-5 md:p-6">
      <h1 className="text-[22px] font-bold tracking-[-0.02em]">Memory</h1>
      <p className="mt-0.5 text-[12px] text-ink-soft">What the team knows about you and the company. Every bot uses it, on every channel. Tell any bot &quot;remember that...&quot; or add it here.</p>

      <form action={addFact} className="mt-5 flex gap-2">
        <label htmlFor="fact" className="sr-only">
          Something to remember
        </label>
        <input id="fact" name="fact" placeholder="For example: we never bid work outside Florida" className="h-10 min-w-0 flex-1 rounded-[10px] bg-sunk px-3 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-lime-deep" />
        <button className="press h-10 cursor-pointer rounded-[10px] bg-ink px-4 text-[13px] font-semibold text-core hover:opacity-90">Remember</button>
      </form>

      <h2 className="mt-6 text-[13px] font-semibold">About you</h2>
      <p className="mt-1 text-[13px]">
        {s.you.name}. {s.you.about}
      </p>

      <h2 className="mt-6 text-[13px] font-semibold">Remembered ({s.facts.length})</h2>
      {s.facts.length ? (
        <ul className="mt-2 divide-y divide-hairline">
          {[...s.facts].reverse().map((f) => (
            <li key={f.id} className="flex items-center gap-3 py-2.5">
              <span className="min-w-0 flex-1 text-[13px]">{f.text}</span>
              <span className="shrink-0 text-[11px] text-ink-soft">
                {botName(ws, f.botId)}, {f.at.slice(5, 10).replace("-", ".")}
              </span>
              <form action={removeFact}>
                <input type="hidden" name="id" value={f.id} />
                <button className="press h-7 cursor-pointer rounded-[8px] px-2 text-[11px] font-medium text-ink-soft hover:bg-sunk hover:text-stop">Forget</button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[12px] text-ink-soft">Nothing yet.</p>
      )}
    </section>
  );
}
