import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { respond } from "@/lib/team/engine";
import { resolve, thread } from "@/lib/team/store";
import { newDemoWorkspace } from "@/lib/workspace/demo";
import type { Workspace } from "@/lib/workspace/types";
import { GROUND_RULES, retryJob, runJobs, startComputer } from "./jobs";
import { setComputerProvider, type ComputerProvider } from "./provider";

/** A stand in computer that records what it was asked and answers as told. */
function fakeComputer(answer: (task: string) => string) {
  const calls: string[] = [];
  const tasks: string[] = [];
  const p: ComputerProvider = {
    key: "fake",
    create: async (name) => (calls.push(`create ${name}`), "pc-1"),
    start: async (id) => void calls.push(`start ${id}`),
    stop: async (id) => void calls.push(`stop ${id}`),
    run: async (_id, task) => {
      tasks.push(task);
      return { text: answer(task), steps: 12, costCents: 7 };
    },
    viewer: async (id) => ({ url: `wss://example.test/${id}`, password: "secret" }),
  };
  return { p, calls, tasks };
}

let ws: Workspace;
const save = async () => {};

async function askForPlans() {
  await respond(ws, "chief", "download the plans for Guess");
  const ap = ws.team.approvals.at(-1)!;
  expect(ap.kind).toBe("computer_job");
  resolve(ws, ap.id, true);
  return ws.team.jobs.at(-1)!;
}

beforeEach(() => {
  process.env.DEMO_TODAY = "2026-11-02";
  process.env.COMPUTER_API_KEY = "test";
  ws = newDemoWorkspace();
});
afterEach(() => {
  setComputerProvider(undefined);
  delete process.env.COMPUTER_API_KEY;
});

describe("computer jobs", () => {
  it("asks first, then downloads the plans on the computer and turns it off", async () => {
    const pc = fakeComputer(() => "Saved 14 files to ~/Plans/guess. The finish schedule is sheet A-601.");
    setComputerProvider(pc.p);

    await respond(ws, "chief", "download the plans for Guess");
    expect(thread(ws, "chief").messages.some((m) => m.from === "scope_analyst")).toBe(true);
    expect(ws.team.jobs).toHaveLength(0);

    const job = await askForPlans();
    expect(job.status).toBe("queued");
    expect(job.task).toMatch(/isqft\.com/);

    await runJobs("demo", ws, save, "bidbot-test");
    expect(job.status).toBe("done");
    expect(job.steps).toBe(12);
    expect(job.costCents).toBe(7);
    expect(pc.tasks[0].startsWith(GROUND_RULES)).toBe(true);
    expect(pc.calls).toEqual(["create bidbot-test", "start pc-1", "stop pc-1"]);
    expect(ws.team.computer?.status).toBe("stopped");
    expect(thread(ws, "chief").messages.at(-1)?.text).toMatch(/Finished on the computer[\s\S]*A-601/);
  });

  it("hands back to a person when a site needs a sign in, and runs again on Try again", async () => {
    let signedIn = false;
    const pc = fakeComputer(() => (signedIn ? "Saved 9 files." : "SIGN IN NEEDED: ConstructConnect asks for a sign in."));
    setComputerProvider(pc.p);
    const job = await askForPlans();

    await runJobs("demo", ws, save, "bidbot-test");
    expect(job.status).toBe("needs_you");
    expect(thread(ws, "chief").messages.at(-1)?.text).toMatch(/sign in yourself/);

    signedIn = true;
    retryJob(ws, job.id);
    await runJobs("demo", ws, save, "bidbot-test");
    expect(job.status).toBe("done");
  });

  it("marks a job failed when the computer errors, and still turns the computer off", async () => {
    const pc = fakeComputer(() => {
      throw new Error("the computer service answered 503");
    });
    setComputerProvider(pc.p);
    const job = await askForPlans();
    await runJobs("demo", ws, save, "bidbot-test");
    expect(job.status).toBe("failed");
    expect(job.result).toMatch(/503/);
    expect(pc.calls.at(-1)).toBe("stop pc-1");
  });

  it("leaves the computer on when a person opened it", async () => {
    const pc = fakeComputer(() => "Done.");
    setComputerProvider(pc.p);
    await startComputer(ws, pc.p, "bidbot-test", true);
    await askForPlans();
    await runJobs("demo", ws, save, "bidbot-test");
    expect(ws.team.computer?.status).toBe("running");
    expect(pc.calls).not.toContain("stop pc-1");
  });

  it("says so instead of queuing when no computer is set up", async () => {
    delete process.env.COMPUTER_API_KEY;
    await respond(ws, "chief", "download the plans for Guess");
    expect(ws.team.approvals).toHaveLength(0);
    expect(thread(ws, "chief").messages.at(-1)?.text).toMatch(/none is set up/);
  });

  it("does nothing when the computer goes away, and keeps the job waiting", async () => {
    setComputerProvider(null);
    const job = await askForPlans();
    await runJobs("demo", ws, save, "bidbot-test");
    expect(job.status).toBe("queued");
  });
});
