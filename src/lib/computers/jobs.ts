import { post, thread, type TeamHolder } from "@/lib/team/store";
import type { ComputerJob } from "@/lib/team/types";
import { computerProvider, type ComputerProvider } from "./provider";

/**
 * Jobs a bot runs on the workspace's computer. A job is queued (after an OK, unless the bot runs on its
 * own), then the runner starts the computer, hands it the task, posts the answer in the bot's thread and
 * stops the computer when nothing is left. Computers bill by the hour, so one is never left running.
 */

/** What the computer is told before every task. A job that needs a person answers with SIGN_IN. */
export const GROUND_RULES = [
  "You are working on behalf of a company, on its own computer.",
  "If a site asks you to sign in and you are not signed in already, stop and answer with one line that starts with SIGN IN NEEDED: and names the site.",
  "Never type a password, never create an account, never pay, never submit, send or accept anything beyond what the task asks.",
  "When you finish, answer in a few plain lines: what you did, and where the results are.",
].join(" ");

const SIGN_IN = /^\s*SIGN IN NEEDED:?\s*/i;
/** A job still marked running after this long lost its runner. */
const STALE_MS = 45 * 60 * 1000;

const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const log = (ws: TeamHolder, table: string, row: unknown) => ws.changes?.push({ table, op: "upsert", row });

export function queueJob(ws: TeamHolder, j: Pick<ComputerJob, "botId" | "threadId" | "title" | "task" | "ref">): ComputerJob {
  const job: ComputerJob = { ...j, id: uid(), at: now(), status: "queued" };
  ws.team.jobs.push(job);
  log(ws, "computer_jobs", job);
  return job;
}

export function retryJob(ws: TeamHolder, id: string): ComputerJob | undefined {
  const job = ws.team.jobs.find((j) => j.id === id);
  if (!job || job.status === "queued" || job.status === "running") return job;
  Object.assign(job, { status: "queued", result: undefined, startedAt: undefined, finishedAt: undefined });
  log(ws, "computer_jobs", job);
  return job;
}

export const hasQueued = (ws: TeamHolder) => ws.team.jobs.some((j) => j.status === "queued");

function setComputer(ws: TeamHolder, status: "running" | "stopped", held?: boolean) {
  if (!ws.team.computer) return;
  ws.team.computer.status = status;
  if (held !== undefined) ws.team.computer.held = held;
  log(ws, "computers", ws.team.computer);
}

/** The workspace's computer, made on first use. */
export async function ensureComputer(ws: TeamHolder, provider: ComputerProvider, name: string): Promise<string> {
  if (ws.team.computer && ws.team.computer.provider === provider.key) return ws.team.computer.providerId;
  const providerId = await provider.create(name);
  ws.team.computer = { provider: provider.key, providerId, status: "stopped" };
  log(ws, "computers", ws.team.computer);
  return providerId;
}

/** Start the computer. `byPerson` keeps it on after jobs finish, until the person closes it. */
export async function startComputer(ws: TeamHolder, provider: ComputerProvider, name: string, byPerson = false) {
  const id = await ensureComputer(ws, provider, name);
  await provider.start(id);
  setComputer(ws, "running", byPerson || ws.team.computer?.held || false);
  return id;
}

export async function stopComputer(ws: TeamHolder, provider: ComputerProvider) {
  if (!ws.team.computer) return;
  await provider.stop(ws.team.computer.providerId);
  setComputer(ws, "stopped", false);
}

function finish(ws: TeamHolder, job: ComputerJob, status: ComputerJob["status"], result: string, extra: Partial<ComputerJob> = {}) {
  Object.assign(job, { status, result, finishedAt: now(), ...extra });
  log(ws, "computer_jobs", job);
  const text =
    status === "done"
      ? `Finished on the computer: ${job.title}.\n\n${result}`
      : status === "needs_you"
        ? `I need you on the computer for ${job.title}: ${result}. Open the computer on this page, sign in yourself, then press Try again. I never type passwords.`
        : `The computer could not finish ${job.title}: ${result}`;
  post(ws, thread(ws, job.threadId.replace(/^t-/, "")), { from: job.botId, text, blocks: [] });
}

const busy = new Set<string>();

/**
 * Run every queued job, one at a time, saving after each step so the app shows progress. `key` names the
 * workspace so two requests never run the same workspace's jobs at once. `name` names a new computer.
 */
export async function runJobs<W extends TeamHolder>(key: string, ws: W, save: (ws: W) => Promise<void>, name: string) {
  if (busy.has(key)) return;
  const provider = await computerProvider();
  if (!provider) return;
  busy.add(key);
  try {
    for (const j of ws.team.jobs) if (j.status === "running" && j.startedAt && Date.now() - Date.parse(j.startedAt) > STALE_MS) finish(ws, j, "failed", "it stopped answering");
    let job: ComputerJob | undefined;
    while ((job = ws.team.jobs.find((j) => j.status === "queued"))) {
      Object.assign(job, { status: "running", startedAt: now() });
      log(ws, "computer_jobs", job);
      await save(ws);
      try {
        const id = await startComputer(ws, provider, name);
        await save(ws);
        const r = await provider.run(id, `${GROUND_RULES}\n\nTask: ${job.task}`);
        if (SIGN_IN.test(r.text)) finish(ws, job, "needs_you", r.text.replace(SIGN_IN, "").replace(/[.]$/, ""), { steps: r.steps, costCents: r.costCents });
        else finish(ws, job, "done", r.text || "Done.", { steps: r.steps, costCents: r.costCents });
      } catch (e) {
        finish(ws, job, "failed", (e as Error).message);
      }
      await save(ws);
    }
  } finally {
    if (ws.team.computer?.status === "running" && !ws.team.computer.held) {
      await stopComputer(ws, provider).catch(() => undefined);
      await save(ws).catch(() => undefined);
    }
    busy.delete(key);
  }
}
