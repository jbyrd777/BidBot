"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { allFixtures } from "@/packs/construction/itb/__fixtures__/emails";
import { ingest, loadSamples, rescreen } from "@/packs/construction/store";
import { hasQueued, retryJob, runJobs, startComputer, stopComputer } from "@/lib/computers/jobs";
import { computerProvider } from "@/lib/computers/provider";
import { respond } from "@/lib/team/engine";
import { forget, getBot, remember, renameMainBot, resolve, setAutonomy, startingBots, toggleAccess } from "@/lib/team/store";
import type { BotId } from "@/lib/team/types";
import { TRADES } from "@/packs/construction/trades";
import { dbConfigured } from "@/lib/supabase/env";
import { DEFAULT_PACK, packFor } from "@/packs";
import { supabaseServer } from "@/lib/supabase/server";
import { commit } from "@/lib/workspace/commit";
import { getWorkspace, WS_COOKIE } from "@/lib/workspace/load";
import { CAN_APPROVE, CAN_MANAGE, type Role, type Workspace } from "@/lib/workspace/types";

const denied = (what: string) => new Error(`Your role can't ${what}. Ask an owner or admin.`);

const computerName = (ws: Workspace) => `bidbot-${ws.id.slice(0, 8)}`;

/** Run queued computer jobs once the response is sent, under the same person's session. */
function runQueuedJobs(ws: Workspace) {
  if (!hasQueued(ws)) return;
  after(async () => {
    const fresh = await getWorkspace();
    await runJobs(fresh.id, fresh, commit, computerName(fresh));
  });
}

export async function sendMessage(botId: string, text: string) {
  const clean = text.trim().slice(0, 4000);
  const ws = await getWorkspace();
  if (!clean || !getBot(ws, botId)) return;
  await respond(ws, botId as BotId, clean);
  await commit(ws);
  runQueuedJobs(ws);
  revalidatePath("/", "layout");
}

/** Send an earlier request to the bot the person picked, without posting it again. */
export async function routeTo(text: string, to: string) {
  const ws = await getWorkspace();
  if (!getBot(ws, to)) return;
  await respond(ws, "chief", text, { to: to as BotId, repost: false });
  await commit(ws);
  runQueuedJobs(ws);
  revalidatePath("/", "layout");
}

export async function answerApproval(id: string, ok: boolean) {
  const ws = await getWorkspace();
  if (!CAN_APPROVE.includes(ws.me.role)) throw denied("approve bot actions");
  resolve(ws, id, ok);
  await commit(ws);
  runQueuedJobs(ws);
  revalidatePath("/", "layout");
}

// The computer -----------------------------------------------------------------------

/**
 * Start the computer for a person and hand back what the live view needs. The password controls the
 * whole computer, so only owners and admins get it, and only for this session.
 */
export async function openComputer(): Promise<{ url?: string; password?: string; error?: string }> {
  const ws = await getWorkspace();
  if (!CAN_MANAGE.includes(ws.me.role)) return { error: "Only owners and admins can open the computer." };
  const provider = await computerProvider();
  if (!provider) return { error: "No computer is set up yet. Add a computer key in Settings." };
  try {
    const id = await startComputer(ws, provider, computerName(ws), true);
    await commit(ws);
    revalidatePath("/", "layout");
    return await provider.viewer(id);
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function closeComputer() {
  const ws = await getWorkspace();
  if (!CAN_MANAGE.includes(ws.me.role)) throw denied("close the computer");
  const provider = await computerProvider();
  if (!provider) return;
  if (ws.team.jobs.some((j) => j.status === "running")) {
    // A job is on it: hand the computer back to the runner, which stops it when the work is done.
    if (ws.team.computer) ws.team.computer.held = false;
    ws.changes.push({ table: "computers", op: "upsert", row: ws.team.computer });
  } else await stopComputer(ws, provider);
  await commit(ws);
  runQueuedJobs(ws);
  revalidatePath("/", "layout");
}

export async function retryComputerJob(id: string) {
  const ws = await getWorkspace();
  if (!CAN_APPROVE.includes(ws.me.role)) throw denied("run computer jobs");
  retryJob(ws, id);
  await commit(ws);
  runQueuedJobs(ws);
  revalidatePath("/", "layout");
}

export async function saveAutonomy(botId: string, autonomy: "ask" | "auto") {
  const ws = await getWorkspace();
  if (!CAN_MANAGE.includes(ws.me.role)) throw denied("change how bots work");
  setAutonomy(ws, botId, autonomy);
  await commit(ws);
  revalidatePath("/", "layout");
}

export async function flipAccess(botId: string, app: string) {
  const ws = await getWorkspace();
  if (!CAN_MANAGE.includes(ws.me.role)) throw denied("change app access");
  toggleAccess(ws, botId, app);
  await commit(ws);
  revalidatePath("/vault");
}

export async function addFact(formData: FormData) {
  const text = String(formData.get("fact") ?? "").trim();
  const ws = await getWorkspace();
  if (text) remember(ws, text.slice(0, 500), "chief");
  await commit(ws);
  revalidatePath("/memory");
}

export async function removeFact(formData: FormData) {
  const ws = await getWorkspace();
  forget(ws, String(formData.get("id")));
  await commit(ws);
  revalidatePath("/memory");
}

export async function saveProfile(formData: FormData) {
  const ws = await getWorkspace();
  const c = ws.company;
  const s = ws.team;

  // Anyone can edit their own name and line.
  s.you.name = String(formData.get("you_name") || s.you.name).slice(0, 80);
  s.you.about = String(formData.get("you_about") ?? s.you.about).slice(0, 400);
  ws.me.name = s.you.name;
  ws.changes.push({ table: "members", op: "update", row: { display_name: s.you.name, about: s.you.about } });

  if (CAN_MANAGE.includes(ws.me.role)) {
    const name = String(formData.get("company") ?? "").trim();
    if (name) c.name = name.slice(0, 120);
    const tradeKey = String(formData.get("trade") || c.trade);
    const tradeChanged = TRADES.some((t) => t.key === tradeKey) && tradeKey !== c.trade;
    if (tradeChanged) {
      c.trade = tradeKey;
      c.settings.trade = tradeKey;
    }
    const states = String(formData.get("states") ?? "").toUpperCase().split(/[^A-Z]+/).filter((x) => x.length === 2);
    if (states.length) c.settings.serviceStates = states;
    const lead = Number(formData.get("lead"));
    if (lead >= 0 && lead < 60) c.settings.minLeadDays = lead;
    const cap = Number(formData.get("capacity"));
    if (cap > 0 && cap < 500) c.weeklyCapacity = cap;
    const main = String(formData.get("main_name") ?? "").trim();
    if (main) renameMainBot(ws, main.slice(0, 40));
    const settings: Partial<typeof c.settings> = { ...c.settings };
    delete settings.trade;
    ws.changes.push({ table: "workspaces", op: "update", row: { name: c.name, trade: c.trade, settings, weekly_capacity: c.weeklyCapacity } });

    // Read the sample invitations again under the new trade, and screen everything against the new rules.
    if (tradeChanged) {
      const fromSamples = new Set(allFixtures.map((f) => f.id));
      const calls = new Map(ws.bids.map((b) => [b.id, { decision: b.decision, decidedAt: b.decidedAt }]));
      const samples = ws.bids.filter((b) => fromSamples.has(b.sourceId));
      if (samples.length) {
        ws.bids = ws.bids.filter((b) => !fromSamples.has(b.sourceId));
        ingest(ws, allFixtures);
        for (const b of ws.bids) Object.assign(b, calls.get(b.id) ?? {});
      }
    }
    rescreen(ws);
  }
  await commit(ws);
  revalidatePath("/", "layout");
}

export async function addSamples() {
  const ws = await getWorkspace();
  if (!CAN_MANAGE.includes(ws.me.role)) throw denied("load sample invitations");
  loadSamples(ws);
  await commit(ws);
  revalidatePath("/", "layout");
}

// Workspaces and people ---------------------------------------------------------------

export async function createWorkspace(formData: FormData) {
  if (!dbConfigured()) redirect("/");
  const name = String(formData.get("company") ?? "").trim().slice(0, 120);
  const trade = String(formData.get("trade") ?? "flooring");
  const you = String(formData.get("you_name") ?? "").trim().slice(0, 80);
  if (!name) return;
  const sb = await supabaseServer();
  const pack = packFor(DEFAULT_PACK);
  const bots = startingBots(pack).map(({ id, name, role }) => ({ id, name, role }));
  const { data, error } = await sb.rpc("create_workspace", { ws_name: name, ws_pack: pack.key, ws_trade: TRADES.some((t) => t.key === trade) ? trade : "flooring", your_name: you, ws_bots: bots });
  if (error) throw new Error(`Could not create the workspace: ${error.message}`);
  (await cookies()).set(WS_COOKIE, data as string, { path: "/", httpOnly: true, sameSite: "lax", secure: true, maxAge: 60 * 60 * 24 * 365 });
  if (formData.get("samples") === "on") {
    const ws = await getWorkspace();
    loadSamples(ws);
    await commit(ws);
  }
  redirect("/");
}

export async function switchWorkspace(formData: FormData) {
  (await cookies()).set(WS_COOKIE, String(formData.get("id")), { path: "/", httpOnly: true, sameSite: "lax", secure: true, maxAge: 60 * 60 * 24 * 365 });
  redirect("/");
}

export async function inviteMember(formData: FormData): Promise<{ link?: string; error?: string }> {
  const ws = await getWorkspace();
  if (!CAN_MANAGE.includes(ws.me.role)) return { error: "Only owners and admins can invite people." };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "viewer") as Role;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter a valid email address." };
  if (role === "owner") return { error: "Invite as admin; ownership can't be handed out by invite." };
  if (ws.mode === "demo") return { error: "Invites turn on once the database is connected." };
  const sb = await supabaseServer();
  const { data, error } = await sb.from("invites").upsert({ workspace_id: ws.id, email, role, invited_by: ws.me.userId, accepted_at: null }, { onConflict: "workspace_id,email" }).select("token").single();
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { link: `/invite/${data.token}` };
}

export async function acceptInvite(formData: FormData) {
  const token = String(formData.get("token"));
  const you = String(formData.get("you_name") ?? "").trim().slice(0, 80);
  const sb = await supabaseServer();
  const { data, error } = await sb.rpc("accept_invite", { invite_token: token, your_name: you });
  if (error) redirect(`/invite/${token}?error=${encodeURIComponent(error.message)}`);
  (await cookies()).set(WS_COOKIE, data as string, { path: "/", httpOnly: true, sameSite: "lax", secure: true, maxAge: 60 * 60 * 24 * 365 });
  redirect("/");
}

export async function signOut() {
  if (dbConfigured()) {
    const sb = await supabaseServer();
    await sb.auth.signOut();
  }
  redirect("/login");
}
