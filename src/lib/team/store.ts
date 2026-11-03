import type { AnyPack } from "./pack";
import type { Approval, ApprovalKind, Block, BotId, Fact, Message, TaskItem, TeamBot, TeamState, Thread } from "./types";

/**
 * The team's working state inside one workspace: bots, one thread per bot, approvals, tasks and memory.
 * Every function takes the workspace it acts on, and records what it changed so the caller can save it.
 * Nothing here is shared between companies.
 */

export interface TeamHolder {
  /** The industry pack this workspace runs on. */
  pack: AnyPack;
  team: TeamState;
  /** Changes waiting to be saved; see lib/workspace. */
  changes?: { table: string; op: string; row: unknown }[];
}

/** The bots a new workspace starts with: the main bot, then the pack's specialists. */
export function startingBots(pack: AnyPack): TeamBot[] {
  return [{ id: "chief", ...pack.mainBot }, ...pack.roster].map((b) => ({ id: b.id, name: b.name, role: b.role, status: "live" as const, autonomy: "ask" as const, access: [] as string[] }));
}

export function seedTeam(pack: AnyPack, you = { name: "Jesse Byrd", about: "Owner. Makes the final bid or no bid call with the estimating lead." }): TeamState {
  return {
    bots: startingBots(pack),
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
  if (a.kind === "create_task") {
    const t = addTask(ws, { title: a.payload.title, owner: a.payload.owner, ref: a.payload.ref || undefined, due: a.payload.due || undefined });
    return `Task added for ${t.owner}: ${t.title}`;
  }
  if (a.kind === "send_email") return "Sending needs a connected mailbox. Connect Gmail or Outlook in the Vault.";
  return ws.pack.execute(ws, a) ?? "That kind of change is not available here";
}

/** A change a bot wants to make: queued for an OK, or carried out now when the bot runs on its own. */
export function change(ws: TeamHolder, botId: BotId, threadBot: BotId, kind: ApprovalKind, summary: string, payload: Record<string, string>): Block {
  const bot = getBot(ws, botId);
  const ap = addApproval(ws, { botId, threadId: thread(ws, threadBot).id, kind, summary, payload });
  if (bot?.autonomy === "auto") {
    ap.status = "done";
    ap.result = execute(ws, ap);
  }
  return { type: "approval", approvalId: ap.id };
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
  post(ws, thread(ws, a.threadId.replace(/^t-/, "")), { from: a.botId, text: ok ? `Done. ${a.result}.` : "Okay, I left it.", blocks: [] });
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
