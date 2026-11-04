import type { ComputerProvider, RunResult } from "./provider";

/**
 * Computers from orgo.ai: Linux desktops with Chrome. Set COMPUTER_API_KEY to an Orgo API key; computers
 * go in the Orgo workspace named by COMPUTER_WORKSPACE_ID, or one called "BidBot" that is made on first use.
 * Server only: the key and the screen passwords never reach a browser bundle.
 */

const BASE = "https://www.orgo.ai/api";
type Json = Record<string, unknown>;

async function api(path: string, init: RequestInit = {}): Promise<Json> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${process.env.COMPUTER_API_KEY}`, "content-type": "application/json", ...init.headers },
  });
  const body = (await res.json().catch(() => ({}))) as Json;
  if (!res.ok) throw new Error(`The computer service answered ${res.status}${typeof body.error === "string" ? `: ${body.error}` : ""}`);
  return body;
}

const list = (j: Json, ...keys: string[]): Json[] => {
  for (const k of keys) if (Array.isArray(j[k])) return j[k] as Json[];
  return Array.isArray(j) ? (j as Json[]) : [];
};

let workspace: Promise<string> | undefined;

function workspaceId(): Promise<string> {
  if (process.env.COMPUTER_WORKSPACE_ID) return Promise.resolve(process.env.COMPUTER_WORKSPACE_ID);
  workspace ??= (async () => {
    const found = list(await api("/workspaces"), "workspaces", "projects", "data").find((w) => w.name === "BidBot");
    if (found) return String(found.id);
    const made = await api("/workspaces", { method: "POST", body: JSON.stringify({ name: "BidBot" }) });
    return String(made.id ?? (made.workspace as Json | undefined)?.id);
  })().catch((e) => {
    workspace = undefined;
    throw e;
  });
  return workspace;
}

/** Read an agent run as Server Sent Events, so a long run keeps the connection busy instead of timing out. */
async function readRun(res: Response): Promise<RunResult> {
  if (!res.body) throw new Error("The computer sent no answer");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let text = "";
  let steps = 0;
  let costCents = 0;
  let finished = false;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") continue;
      let chunk: Json;
      try {
        chunk = JSON.parse(data);
      } catch {
        continue;
      }
      if (chunk.error) throw new Error(`The computer stopped: ${String((chunk.error as Json).message ?? chunk.error)}`);
      const choice = (chunk.choices as Json[] | undefined)?.[0];
      const delta = choice?.delta as Json | undefined;
      if (typeof delta?.content === "string") text += delta.content;
      if (choice?.finish_reason) finished = true;
      const o = chunk.orgo as Json | undefined;
      if (o) {
        steps = Number(o.steps ?? steps);
        costCents = Number(o.cost_cents ?? costCents);
      }
    }
  }
  if (!finished) throw new Error("The computer stopped before it finished");
  return { text: text.trim(), steps, costCents };
}

export const orgo: ComputerProvider = {
  key: "orgo",
  create: async (name) => {
    const made = await api("/computers", { method: "POST", body: JSON.stringify({ workspace_id: await workspaceId(), name, ram: 8 }) });
    return String(made.id);
  },
  start: async (id) => {
    await api(`/computers/${id}/start`, { method: "POST", body: "{}" });
  },
  stop: async (id) => {
    await api(`/computers/${id}/stop`, { method: "POST", body: "{}" });
  },
  run: async (id, task) => {
    const res = await fetch(`${BASE}/v1/chat/completions`, {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.COMPUTER_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ computer_id: id, stream: true, messages: [{ role: "user", content: task }] }),
    });
    if (!res.ok) throw new Error(`The computer service answered ${res.status}`);
    return readRun(res);
  },
  viewer: async (id) => {
    const c = await api(`/computers/${id}`);
    return { url: `wss://www.orgo.ai/desktops/${id}/ws/websockify`, password: String(c.vnc_password ?? "") };
  },
};
