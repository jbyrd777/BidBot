import { DEFAULT_ROSTER } from "@/lib/bots/roster";
import { decide, getBid, type BidHolder } from "@/lib/data/store";
import type { Approval, BotId, Fact, Message, TaskItem, TeamBot, TeamState, Thread } from "./types";

/**
 * The team's working state inside one workspace: bots, one thread per bot, approvals, tasks and memory.
 * Every function takes the workspace it acts on, and records what it changed so the caller can save it.
 * Nothing here is shared between companies.
 */

export interface TeamHolder extends BidHolder {
  team: TeamState;
}

export const DEFAULT_MAIN_BOT: TeamBot = {
  id: "chief",
  name: "Foreman",
  role: "Runs the team. Takes any request, hands it to the right bot and reports back",
  status: "live",
  autonomy: "ask",
  access: [],
};

export function seedTeam(you = { name: "Jesse Byrd", about: "Owner. Makes the final bid or no bid call with the estimating lead." }): TeamState {
  return {
    bots: [{ ...DEFAULT_MAIN_BOT }, ...DEFAULT_ROSTER.map((b) => ({ id: b.kind, name: b.name, role: b.role, status: "live" as const, autonomy: "ask" as const, access: [] as string[] }))],
    threads: [],
    approvals: [],
    tasks: [],
    facts: [],
    you,
  };
}

const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const log = (ws: TeamHolder, table: string, op: string, row: unknown) => ws.changes?.push({ table, op, row });

export function team(ws: TeamHolder): TeamState {
  return ws.team;
}

export function getBot(ws: TeamHolder, id: string): TeamBot | undefined {
  return ws.team.bots.find((b) => b.id === id);
}

export function botName(ws: TeamHolder, id: BotId | "user") {
  return id === "user" ? ws.team.you.name : getBot(ws, id)?.name ?? id;
}

export function thread(ws: TeamHolder, botId: BotId): Thread {
  let t = ws.team.threads.find((x) => x.botId === botId);
  if (!t) {
    t = { id: `t-${botId}`, botId, messages: [] };
    ws.team.threads.push(t);
  }
  return t;
}

export function post(ws: TeamHolder, t: Thread, m: Omit<Message, "id" | "at">): Message {
  const msg = { ...m, id: uid(), at: now() };
  t.messages.push(msg);
  log(ws, "messages", "insert", { ...msg, threadBot: t.botId });
  return msg;
}

export function addApproval(ws: TeamHolder, a: Omit<Approval, "id" | "at" | "status">): Approval {
  const ap: Approval = { ...a, id: uid(), at: now(), status: "waiting" };
  ws.team.approvals.push(ap);
  log(ws, "approvals", "insert", ap);
  return ap;
}

export function waiting(ws: TeamHolder) {
  return ws.team.approvals.filter((a) => a.status === "waiting");
}

export function addTask(ws: TeamHolder, t: Omit<TaskItem, "id" | "at" | "status">): TaskItem {
  const task: TaskItem = { ...t, id: uid(), at: now(), status: "open" };
  ws.team.tasks.push(task);
  log(ws, "tasks", "insert", task);
  return task;
}

export function remember(ws: TeamHolder, text: string, botId: BotId): Fact {
  const f = { id: uid(), at: now(), text, botId };
  ws.team.facts.push(f);
  log(ws, "facts", "insert", f);
  return f;
}

export function forget(ws: TeamHolder, id: string) {
  ws.team.facts = ws.team.facts.filter((f) => f.id !== id);
  log(ws, "facts", "delete", { id });
}

/** Carry out an approved change. Only changes inside the app run here; sending needs a connected mailbox. */
export function execute(ws: TeamHolder, a: Approval): string {
  if (a.kind === "decide") {
    const bid = decide(ws, a.payload.bidId, a.payload.decision as "bid" | "no_bid");
    return bid ? `${bid.projectName} marked as ${a.payload.decision === "bid" ? "bidding" : "not bidding"}` : "That bid is no longer on the board";
  }
  if (a.kind === "create_task") {
    const t = addTask(ws, { title: a.payload.title, owner: a.payload.owner, bidId: a.payload.bidId || undefined, due: a.payload.due || undefined });
    return `Task added for ${t.owner}: ${t.title}`;
  }
  return "Sending needs a connected mailbox. Connect Gmail or Outlook in the Vault.";
}

export function resolve(ws: TeamHolder, id: string, ok: boolean): Approval | undefined {
  const a = ws.team.approvals.find((x) => x.id === id);
  if (!a || a.status !== "waiting") return a;
  if (!ok) {
    a.status = "declined";
    a.result = "Left as it was";
  } else {
    a.result = execute(ws, a);
    a.status = "done";
  }
  log(ws, "approvals", "update", a);
  post(ws, thread(ws, a.threadId.replace(/^t-/, "") as BotId), { from: a.botId, text: ok ? `Done. ${a.result}.` : "Okay, I left it.", blocks: [] });
  return a;
}

export function setAutonomy(ws: TeamHolder, id: string, autonomy: "ask" | "auto") {
  const b = getBot(ws, id);
  if (!b) return;
  b.autonomy = autonomy;
  log(ws, "bots", "update", b);
}

export function toggleAccess(ws: TeamHolder, botId: string, app: string) {
  const b = getBot(ws, botId);
  if (!b) return;
  b.access = b.access.includes(app) ? b.access.filter((x) => x !== app) : [...b.access, app];
  log(ws, "bots", "update", b);
}

export function renameMainBot(ws: TeamHolder, name: string) {
  const b = getBot(ws, "chief");
  if (!b) return;
  b.name = name;
  log(ws, "bots", "update", b);
}

export { getBid };
