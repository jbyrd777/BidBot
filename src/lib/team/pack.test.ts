import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { w } from "./router";
import { respond } from "./engine";
import { change, resolve, seedTeam, thread, type TeamHolder } from "./store";
import type { IndustryPack } from "./pack";

/** A made up second industry, to prove the core runs any pack without knowing about it. */
type Job = { id: string; name: string; done: boolean };
type YardWs = TeamHolder & { jobs: Job[] };

const yards: IndustryPack<YardWs, { jobs: Job[] }> = {
  key: "landscaping",
  name: "Landscaping",
  mainBot: { name: "Crew Chief", role: "Runs the team" },
  roster: [{ id: "dispatch", name: "Dispatch", role: "Books crews" }],
  signals: { dispatch: w(3, "crew", "schedule") },
  fallbackBot: "dispatch",
  covers: "your crews and jobs",
  reply: (ws, bot, _text, threadBot) => ({ text: `${bot} here`, blocks: [change(ws, "dispatch", threadBot, "finish_job", `Finish ${ws.jobs[0].name}`, { job: ws.jobs[0].id })] }),
  tools: {},
  about: () => "Green Yards, a landscaping company",
  rules: () => [],
  execute: (ws, a) => {
    if (a.kind !== "finish_job") return undefined;
    const job = ws.jobs.find((j) => j.id === a.payload.job)!;
    job.done = true;
    return `${job.name} finished`;
  },
  demo: () => ({ jobs: [{ id: "j1", name: "Oak Street mow", done: false }] }),
  load: async () => ({ jobs: [] }),
  save: async () => {},
};

describe("industry packs", () => {
  it("runs a pack the core has never heard of", async () => {
    const ws: YardWs = { pack: yards, team: seedTeam(yards), changes: [], ...yards.demo() };
    expect(ws.team.bots.map((b) => b.name)).toEqual(["Crew Chief", "Dispatch"]);

    await respond(ws, "chief", "book a crew for Oak Street");
    const reply = thread(ws, "chief").messages.at(-1)!;
    expect(reply.from).toBe("dispatch");

    const ap = ws.team.approvals[0];
    expect(ap.kind).toBe("finish_job");
    expect(ws.jobs[0].done).toBe(false);
    resolve(ws, ap.id, true);
    expect(ws.jobs[0].done).toBe(true);
  });

  it("keeps the core free of any one industry", () => {
    const core = join(__dirname, "..");
    const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : [join(dir, f)]));
    const leaks = files(core).filter((f) => !f.endsWith(".test.ts") && /@\/packs\/(?!blocks")[a-z]/.test(readFileSync(f, "utf8")));
    expect(leaks).toEqual([]);
  });
});
