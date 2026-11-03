import { supabaseServer } from "@/lib/supabase/server";
import type { Approval, Fact, Message, TaskItem, TeamBot } from "@/lib/team/types";
import type { Workspace } from "./types";

/**
 * Save what a request changed. Runs under the signed in person's session, so the database's
 * row level security has the last word on every write: a write into another company simply fails.
 */
export async function commit(ws: Workspace) {
  if (ws.mode === "demo" || !ws.changes.length) {
    ws.changes = [];
    return;
  }
  const sb = await supabaseServer();
  const id = ws.id;
  const by = ws.me.userId;

  // Keep only the last write to each row, then save in an order that respects references.
  const last = new Map<string, (typeof ws.changes)[number]>();
  for (const c of ws.changes) {
    const key = `${c.table}:${(c.row as { id?: string }).id ?? Math.random()}`;
    last.set(key, c);
  }
  const changes = [...last.values()];
  const of = (table: string) => changes.filter((c) => c.table === table);
  const fail = (what: string, e: { message: string } | null) => {
    if (e) throw new Error(`Could not save ${what}: ${e.message}`);
  };

  // The pack's own records first: tasks and approvals may point at them.
  await ws.pack.save(sb, ws, changes, by);

  for (const c of of("bots")) {
    const b = c.row as TeamBot;
    const { error } = await sb.from("bots").update({ name: b.name, autonomy: b.autonomy, access: b.access }).eq("workspace_id", id).eq("id", b.id);
    fail("bot settings", error);
  }

  const tasks = of("tasks").map((c) => c.row as TaskItem);
  if (tasks.length) {
    const { error } = await sb.from("tasks").upsert(tasks.map((t) => ({ id: t.id, workspace_id: id, title: t.title, owner: t.owner, ref: t.ref ?? null, due: t.due || null, status: t.status, created_at: t.at })));
    fail("tasks", error);
  }

  const approvals = of("approvals").map((c) => c.row as Approval);
  if (approvals.length) {
    const { error } = await sb.from("approvals").upsert(
      approvals.map((a) => ({
        id: a.id,
        workspace_id: id,
        bot_id: a.botId,
        thread_bot: a.threadId.replace(/^t-/, ""),
        kind: a.kind,
        summary: a.summary,
        payload: a.payload,
        status: a.status,
        result: a.result ?? null,
        decided_by: a.status === "waiting" ? null : by,
        decided_at: a.status === "waiting" ? null : new Date().toISOString(),
        created_at: a.at,
      })),
    );
    fail("approvals", error);
  }

  const messages = of("messages").map((c) => c.row as Message & { threadBot: string });
  if (messages.length) {
    const { error } = await sb
      .from("messages")
      .insert(messages.map((m) => ({ id: m.id, workspace_id: id, thread_bot: m.threadBot, sender: m.from, author: m.from === "user" ? by : null, text: m.text, blocks: m.blocks, created_at: m.at })));
    fail("messages", error);
  }

  for (const c of of("facts")) {
    const f = c.row as Fact;
    const { error } = c.op === "delete" ? await sb.from("facts").delete().eq("workspace_id", id).eq("id", f.id) : await sb.from("facts").insert({ id: f.id, workspace_id: id, text: f.text, bot_id: f.botId, created_by: by, created_at: f.at });
    fail("memory", error);
  }

  for (const c of of("workspaces")) {
    const { error } = await sb.from("workspaces").update(c.row as object).eq("id", id);
    fail("settings", error);
  }
  for (const c of of("members")) {
    const { error } = await sb.from("members").update(c.row as object).eq("workspace_id", id).eq("user_id", by);
    fail("your profile", error);
  }

  ws.changes = [];
}
