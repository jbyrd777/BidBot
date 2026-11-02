import { DEFAULT_ROSTER } from "@/lib/bots/roster";
import { decide, getBid } from "@/lib/data/store";
import type { Approval, BotId, Fact, Message, TaskItem, TeamBot, TeamState, Thread } from "./types";

/**
 * The team's working state: bots, one thread per bot, approvals waiting for an OK, tasks and memory.
 * Kept in memory for the demo, like the bid store; a database table per collection replaces it.
 */

const CHIEF: TeamBot = {
  id: "chief",
  name: "Foreman",
  role: "Runs the team. Takes any request, hands it to the right bot and reports back",
  status: "live",
  autonomy: "ask",
  access: [],
};

function seed(): TeamState {
  return {
    bots: [
      CHIEF,
      ...DEFAULT_ROSTER.map((b) => ({ id: b.kind, name: b.name, role: b.role, status: b.status === "off" ? ("live" as const) : b.status, autonomy: "ask" as const, access: [] })),
    ],
    threads: [],
    approvals: [],
    tasks: [],
    facts: [],
    you: { name: "Jesse Byrd", about: "Owner. Makes the final bid or no bid call with the estimating lead." },
  };
}

const g = globalThis as unknown as { __team?: TeamState };
export function team(): TeamState {
  if (!g.__team) g.__team = seed();
  return g.__team;
}

const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();

export function getBot(id: string): TeamBot | undefined {
  return team().bots.find((b) => b.id === id);
}

export function botName(id: BotId | "user") {
  return id === "user" ? team().you.name : getBot(id)?.name ?? id;
}

export function thread(botId: BotId): Thread {
  const s = team();
  let t = s.threads.find((x) => x.botId === botId);
  if (!t) {
    t = { id: `t-${botId}`, botId, messages: [] };
    s.threads.push(t);
  }
  return t;
}

export function post(t: Thread, m: Omit<Message, "id" | "at">): Message {
  const msg = { ...m, id: uid(), at: now() };
  t.messages.push(msg);
  return msg;
}

export function addApproval(a: Omit<Approval, "id" | "at" | "status">): Approval {
  const ap: Approval = { ...a, id: uid(), at: now(), status: "waiting" };
  team().approvals.push(ap);
  return ap;
}

export function waiting() {
  return team().approvals.filter((a) => a.status === "waiting");
}

export function addTask(t: Omit<TaskItem, "id" | "at" | "status">): TaskItem {
  const task: TaskItem = { ...t, id: uid(), at: now(), status: "open" };
  team().tasks.push(task);
  return task;
}

export function remember(text: string, botId: BotId): Fact {
  const f = { id: uid(), at: now(), text, botId };
  team().facts.push(f);
  return f;
}

export function forget(id: string) {
  const s = team();
  s.facts = s.facts.filter((f) => f.id !== id);
}

/** Carry out an approved change. Only changes inside the app run here; sending needs a connected mailbox. */
export function execute(a: Approval): string {
  if (a.kind === "decide") {
    const bid = decide(a.payload.bidId, a.payload.decision as "bid" | "no_bid");
    return bid ? `${bid.projectName} marked as ${a.payload.decision === "bid" ? "bidding" : "not bidding"}` : "That bid is no longer on the board";
  }
  if (a.kind === "create_task") {
    const t = addTask({ title: a.payload.title, owner: a.payload.owner, bidId: a.payload.bidId || undefined, due: a.payload.due || undefined });
    return `Task added for ${t.owner}: ${t.title}`;
  }
  return "Sending needs a connected mailbox. Connect Gmail or Outlook in the Vault.";
}

export function resolve(id: string, ok: boolean): Approval | undefined {
  const a = team().approvals.find((x) => x.id === id);
  if (!a || a.status !== "waiting") return a;
  if (!ok) {
    a.status = "declined";
    a.result = "Left as it was";
  } else {
    a.result = execute(a);
    a.status = "done";
  }
  post(thread(a.threadId.replace(/^t-/, "") as BotId), { from: a.botId, text: ok ? `Done. ${a.result}.` : "Okay, I left it.", blocks: [] });
  return a;
}

export function setAutonomy(id: string, autonomy: "ask" | "auto") {
  const b = getBot(id);
  if (b) b.autonomy = autonomy;
}

export function toggleAccess(botId: string, app: string) {
  const b = getBot(botId);
  if (!b) return;
  b.access = b.access.includes(app) ? b.access.filter((x) => x !== app) : [...b.access, app];
}

export { getBid };
