import { connection } from "next/server";
import { ApprovalCard } from "@/components/team/chat-screen";
import { team } from "@/lib/team/store";

export const metadata = { title: "Waiting for your OK" };
export const instant = false;

export default async function Waiting() {
  await connection();
  const all = [...team().approvals].reverse();
  const open = all.filter((a) => a.status === "waiting");
  const past = all.filter((a) => a.status !== "waiting").slice(0, 20);
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <section className="card p-5 md:p-6">
        <h1 className="text-[22px] font-bold tracking-[-0.02em]">Waiting for your OK</h1>
        <p className="mt-0.5 text-[12px] text-ink-soft">Reading runs on its own. Changes and anything that goes out wait here until you say so.</p>
        <div className="mt-5 flex flex-col gap-2">
          {open.length ? open.map((a) => <ApprovalCard key={a.id} a={a} />) : <p className="rounded-[10px] bg-sunk px-4 py-8 text-center text-[13px] text-ink-soft">Nothing is waiting.</p>}
        </div>
      </section>
      <section className="card p-5 md:p-6">
        <h2 className="text-[15px] font-semibold">Recently answered</h2>
        <div className="mt-4 flex flex-col gap-2">
          {past.length ? past.map((a) => <ApprovalCard key={a.id} a={a} compact />) : <p className="text-[12px] text-ink-soft">Nothing answered yet.</p>}
        </div>
      </section>
    </div>
  );
}
