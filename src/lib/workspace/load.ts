import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Bid, Company } from "@/lib/data/store";
import type { ScreenSettings } from "@/lib/itb/screen";
import { dbConfigured } from "@/lib/supabase/env";
import { supabaseServer } from "@/lib/supabase/server";
import type { Approval, BotId, Fact, TaskItem, TeamBot, Thread } from "@/lib/team/types";
import { demoWorkspace } from "./demo";
import type { Role, Workspace } from "./types";

export const WS_COOKIE = "bb_ws";

type Row = Record<string, unknown>;

/** Who is signed in, or null. Cheap: used by pages that only need to know. */
export const currentUser = cache(async () => {
  if (!dbConfigured()) return { id: "demo", email: "demo@local" };
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  return data.user ? { id: data.user.id, email: data.user.email ?? "" } : null;
});

/**
 * The signed in person's workspace, loaded fresh for this request. Redirects to sign in, or to set up a
 * workspace, when there is none. Every query runs under the person's session, so row level security
 * guarantees only their company's rows come back.
 */
export async function getWorkspace(): Promise<Workspace> {
  if (!dbConfigured()) return demoWorkspace();
  const ws = await loadWorkspace();
  if (ws === "signed_out") redirect("/login");
  if (ws === "no_workspace") redirect("/onboarding");
  return ws;
}

async function loadWorkspace(): Promise<Workspace | "signed_out" | "no_workspace"> {
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  const user = auth.user;
  if (!user) return "signed_out";

  const { data: memberships } = await sb.from("members").select("workspace_id, role, display_name, about").eq("user_id", user.id);
  if (!memberships?.length) return "no_workspace";
  const wanted = (await cookies()).get(WS_COOKIE)?.value;
  const me = memberships.find((m) => m.workspace_id === wanted) ?? memberships[0];
  const wsId = me.workspace_id as string;

  const [w, bots, msgs, approvals, tasks, facts, bids] = await Promise.all([
    sb.from("workspaces").select("*").eq("id", wsId).single(),
    sb.from("bots").select("*").eq("workspace_id", wsId).order("sort"),
    sb.from("messages").select("*").eq("workspace_id", wsId).order("created_at", { ascending: false }).limit(600),
    sb.from("approvals").select("*").eq("workspace_id", wsId).order("created_at", { ascending: false }).limit(300),
    sb.from("tasks").select("*").eq("workspace_id", wsId).order("created_at"),
    sb.from("facts").select("*").eq("workspace_id", wsId).order("created_at"),
    sb.from("bids").select("data, decision, decided_at").eq("workspace_id", wsId),
  ]);
  if (w.error || !w.data) throw new Error(`Could not load the workspace: ${w.error?.message ?? "not found"}`);

  const settings = { ...(w.data.settings as ScreenSettings), trade: w.data.trade as string };
  const company: Company = { id: wsId, name: w.data.name as string, settings, trade: w.data.trade as string, weeklyCapacity: w.data.weekly_capacity as number };

  const threads = new Map<string, Thread>();
  for (const m of [...(msgs.data ?? [])].reverse() as Row[]) {
    const bot = m.thread_bot as BotId;
    if (!threads.has(bot)) threads.set(bot, { id: `t-${bot}`, botId: bot, messages: [] });
    threads.get(bot)!.messages.push({ id: m.id as string, at: m.created_at as string, from: m.sender as BotId | "user", text: m.text as string, blocks: m.blocks as never });
  }

  return {
    id: wsId,
    mode: "db",
    company,
    bids: ((bids.data ?? []) as Row[]).map((r) => ({ ...(r.data as Bid), decision: r.decision as Bid["decision"], decidedAt: (r.decided_at as string) ?? undefined })),
    team: {
      bots: ((bots.data ?? []) as Row[]).map((b) => ({ id: b.id, name: b.name, role: b.role, status: b.status, autonomy: b.autonomy, access: b.access }) as TeamBot),
      threads: [...threads.values()],
      approvals: ((approvals.data ?? []) as Row[]).reverse().map(
        (a) =>
          ({ id: a.id, at: a.created_at, botId: a.bot_id, threadId: `t-${a.thread_bot}`, kind: a.kind, summary: a.summary, payload: a.payload, status: a.status, result: a.result ?? undefined }) as Approval,
      ),
      tasks: ((tasks.data ?? []) as Row[]).map((t) => ({ id: t.id, at: t.created_at, title: t.title, owner: t.owner, bidId: t.bid_id ?? undefined, due: t.due ?? undefined, status: t.status }) as TaskItem),
      facts: ((facts.data ?? []) as Row[]).map((f) => ({ id: f.id, at: f.created_at, text: f.text, botId: f.bot_id }) as Fact),
      you: { name: (me.display_name as string) || user.email || "You", about: (me.about as string) ?? "" },
    },
    me: { userId: user.id, role: me.role as Role, name: (me.display_name as string) || user.email || "You", about: (me.about as string) ?? "", email: user.email ?? undefined },
    changes: [],
  };
}

/** Every workspace the signed in person belongs to, for the workspace switcher. */
export async function myWorkspaces(): Promise<{ id: string; name: string; role: Role }[]> {
  if (!dbConfigured()) return [{ id: "demo", name: demoWorkspace().company.name, role: "owner" }];
  const sb = await supabaseServer();
  const { data } = await sb.from("members").select("role, workspaces(id, name)");
  return ((data ?? []) as Row[]).map((r) => {
    const w = r.workspaces as Row;
    return { id: w.id as string, name: w.name as string, role: r.role as Role };
  });
}

/** People in the workspace and invites not yet accepted. Owners and admins see invites; RLS hides them from others. */
export async function teamMembers(ws: Workspace) {
  if (ws.mode === "demo") return { members: [{ userId: ws.me.userId, name: ws.me.name, role: ws.me.role }], invites: [] as { email: string; role: Role; token: string }[] };
  const sb = await supabaseServer();
  const [m, i] = await Promise.all([
    sb.from("members").select("user_id, display_name, role").eq("workspace_id", ws.id).order("created_at"),
    sb.from("invites").select("email, role, token").eq("workspace_id", ws.id).is("accepted_at", null).order("created_at"),
  ]);
  return {
    members: ((m.data ?? []) as Row[]).map((r) => ({ userId: r.user_id as string, name: (r.display_name as string) || "Teammate", role: r.role as Role })),
    invites: ((i.data ?? []) as Row[]).map((r) => ({ email: r.email as string, role: r.role as Role, token: r.token as string })),
  };
}
