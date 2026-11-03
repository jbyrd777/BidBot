import type { PackTool } from "./pack";
import { botName, change, remember, team, waiting, type TeamHolder } from "./store";
import type { BotId, Block, Thread } from "./types";

/**
 * The language model behind the team. Any provider with an OpenAI compatible chat API works:
 * set MODEL_API_KEY, MODEL_NAME, and MODEL_BASE_URL when it is not OpenAI.
 * Each tool belongs to one bot, so the reply is credited to the bot whose skill did the work.
 */

export function modelConfigured() {
  return !!(process.env.MODEL_API_KEY && process.env.MODEL_NAME);
}

/** The main bot's own tools; every pack gets these alongside its own. */
const CORE_TOOLS: Record<string, PackTool> = {
  remember: {
    owner: "chief",
    description: "Save a fact about the person or the company for every bot to use.",
    parameters: { type: "object", properties: { fact: { type: "string" } }, required: ["fact"] },
    run: (ws, a) => {
      remember(ws, a.fact, "chief");
      return "Saved.";
    },
  },
  add_task: {
    owner: "chief",
    description: "Add a task to someone's list. Shown for an OK.",
    parameters: { type: "object", properties: { title: { type: "string" }, owner: { type: "string" }, due: { type: "string", description: "YYYY-MM-DD" } }, required: ["title"] },
    run: (ws, a, t, blocks) => {
      blocks.push(change(ws, "chief", t, "create_task", `Add a task: ${a.title}`, { title: a.title, owner: a.owner || team(ws).you.name, due: a.due || "" }));
      return "Queued for the person's OK.";
    },
  },
  list_waiting: {
    owner: "chief",
    description: "What is waiting for the person's OK.",
    parameters: { type: "object", properties: {} },
    run: (ws, _a, _t, blocks) => {
      const w = waiting(ws);
      blocks.push(...w.map((x) => ({ type: "approval" as const, approvalId: x.id })));
      return JSON.stringify(w.map((x) => x.summary));
    },
  },
};

function tools(ws: TeamHolder): Record<string, PackTool> {
  return { ...ws.pack.tools, ...CORE_TOOLS };
}

const today = () => process.env.DEMO_TODAY ?? new Date().toISOString().slice(0, 10);

function system(ws: TeamHolder, threadBot: BotId) {
  const s = team(ws);
  const me = threadBot === "chief" ? "the main bot. You run the team and hand work to the specialist whose tools fit" : `${botName(ws, threadBot)}, a specialist on the team`;
  return [
    `You are ${botName(ws, threadBot)}, ${me}, working for ${ws.pack.about(ws)}. Today is ${today()}.`,
    `The team: ${s.bots.map((b) => `${b.name} (${b.role})`).join("; ")}.`,
    `You are talking with ${s.you.name}. ${s.you.about}`,
    s.facts.length ? `Things to remember: ${s.facts.map((f) => f.text).join("; ")}.` : "",
    ...ws.pack.rules(ws),
    "Changes and anything that goes out are queued for the person's OK by the tools. Never claim something was sent or changed unless a tool said so.",
    "Never name the software, model or company behind you.",
  ]
    .filter(Boolean)
    .join("\n");
}

type ChatMsg = { role: "system" | "user" | "assistant" | "tool"; content: string | null; tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[]; tool_call_id?: string };

export async function modelTurn(ws: TeamHolder, threadBot: BotId, t: Thread): Promise<{ from: BotId; text: string; blocks: Block[]; handoff: boolean }> {
  const base = (process.env.MODEL_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const messages: ChatMsg[] = [
    { role: "system", content: system(ws, threadBot) },
    ...t.messages
      .filter((m) => m.text)
      .slice(-24)
      .map((m) => ({ role: m.from === "user" ? ("user" as const) : ("assistant" as const), content: m.text })),
  ];
  const all = tools(ws);
  const defs = Object.entries(all).map(([name, x]) => ({ type: "function" as const, function: { name, description: `${x.description} (Skill of ${botName(ws, x.owner)}.)`, parameters: x.parameters } }));
  const blocks: Block[] = [];
  let from: BotId = threadBot;

  for (let step = 0; step < 6; step++) {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.MODEL_API_KEY}` },
      body: JSON.stringify({ model: process.env.MODEL_NAME, messages, tools: defs }),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();
    const msg = data.choices?.[0]?.message as ChatMsg | undefined;
    if (!msg) throw new Error("empty reply");
    if (!msg.tool_calls?.length) return { from, text: msg.content?.trim() || "Done.", blocks, handoff: from !== threadBot };
    messages.push({ role: "assistant", content: msg.content ?? null, tool_calls: msg.tool_calls });
    for (const call of msg.tool_calls) {
      const tool = all[call.function.name];
      let out = "Unknown tool.";
      if (tool) {
        if (tool.owner !== "chief" && tool.owner !== from && !(tool.shared && from !== threadBot)) from = tool.owner;
        let args: Record<string, string> = {};
        try {
          args = JSON.parse(call.function.arguments || "{}");
        } catch {}
        out = tool.run(ws, args, threadBot, blocks);
      }
      messages.push({ role: "tool", tool_call_id: call.id, content: out });
    }
  }
  return { from, text: "That took more steps than one turn allows. Try splitting the request.", blocks, handoff: from !== threadBot };
}
