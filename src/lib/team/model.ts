import { getBid, getCompany, today, trade } from "@/lib/data/store";
import { card, searchBids, type EmailPurpose } from "@/lib/agent/ops";
import { decisionCard, draftProposal, draftRfq, gcEmail, requestTakeoff, scopeSnapshot, submittalChecklist, change } from "./skills";
import { botName, remember, team, waiting, type TeamHolder } from "./store";
import type { BotId, Block, Thread } from "./types";

/**
 * The language model behind the team. Any provider with an OpenAI compatible chat API works:
 * set MODEL_API_KEY, MODEL_NAME, and MODEL_BASE_URL when it is not OpenAI.
 * Each tool belongs to one bot, so the reply is credited to the bot whose skill did the work.
 */

export function modelConfigured() {
  return !!(process.env.MODEL_API_KEY && process.env.MODEL_NAME);
}

type Tool = { owner: BotId; description: string; parameters: Record<string, unknown>; run: (ws: TeamHolder, a: Record<string, string>, threadBot: BotId, blocks: Block[]) => string };

const bidArg = { type: "object", properties: { bid_id: { type: "string" } }, required: ["bid_id"] };

function withBid(fn: (ws: TeamHolder, b: NonNullable<ReturnType<typeof getBid>>, a: Record<string, string>, threadBot: BotId) => { text: string; blocks: Block[] }) {
  return (ws: TeamHolder, a: Record<string, string>, threadBot: BotId, blocks: Block[]) => {
    const b = getBid(ws, a.bid_id);
    if (!b) return "No bid with that id. Call search_bids first.";
    const r = fn(ws, b, a, threadBot);
    blocks.push(...r.blocks);
    return r.text;
  };
}

const TOOLS: Record<string, Tool> = {
  search_bids: {
    owner: "bid_desk",
    description: "List bids on the board. Filters are optional. decision: pending (undecided), bid, no_bid, all. recommendation: bid, review (needs a look), no_bid (likely pass).",
    parameters: {
      type: "object",
      properties: {
        decision: { type: "string", enum: ["pending", "bid", "no_bid", "all"] },
        recommendation: { type: "string", enum: ["bid", "review", "no_bid"] },
        due_within_days: { type: "number" },
        text: { type: "string" },
        outside_service_area: { type: "boolean" },
      },
    },
    run: (ws, a, _t, blocks) => {
      const bids = searchBids(ws, {
        decision: a.decision as never,
        recommendation: a.recommendation as never,
        dueWithinDays: a.due_within_days === undefined ? undefined : Number(a.due_within_days),
        text: a.text,
        outsideServiceArea: a.outside_service_area as unknown as boolean,
      });
      if (bids.length) blocks.push({ type: "bids", title: "Bids", bids: bids.map(card) });
      return JSON.stringify(bids.map((b) => ({ ...card(b), state: b.state })));
    },
  },
  get_bid: {
    owner: "bid_desk",
    description: "Everything known about one bid: dates, scope, contact, links, description and screening reasons.",
    parameters: bidArg,
    run: (ws, a) => {
      const b = getBid(ws, a.bid_id);
      if (!b) return "No bid with that id.";
      const { events, ...rest } = b;
      return JSON.stringify({ ...rest, history: events.map((e) => `${e.at.slice(0, 10)} ${e.summary}`) });
    },
  },
  propose_decision: {
    owner: "bid_desk",
    description: "Mark a bid as bidding or not bidding. Shown to the person for an OK unless the bot runs on its own.",
    parameters: { type: "object", properties: { bid_id: { type: "string" }, decision: { type: "string", enum: ["bid", "no_bid"] } }, required: ["bid_id", "decision"] },
    run: withBid((ws, b, a, t) => ({ text: "Queued for the person's OK.", blocks: [decisionCard(ws, b, a.decision as "bid" | "no_bid", t)] })),
  },
  scope_snapshot: { owner: "scope_analyst", description: "Scope snapshot for a bid from what is known so far.", parameters: bidArg, run: withBid((ws, b) => scopeSnapshot(ws, b)) },
  request_takeoff: { owner: "takeoff_coordinator", description: "Put a takeoff for a bid in the estimating queue.", parameters: bidArg, run: withBid((ws, b, _a, t) => requestTakeoff(ws, b, t)) },
  draft_rfq: { owner: "vendor_rfq", description: "Draft an RFQ to distributors for a bid's scope.", parameters: bidArg, run: withBid((ws, b) => draftRfq(ws, b)) },
  draft_proposal: { owner: "proposal_builder", description: "Outline a proposal for a bid. Never include a price.", parameters: bidArg, run: withBid((ws, b) => draftProposal(ws, b)) },
  submittal_checklist: { owner: "submittals", description: "Submittal checklist for a bid.", parameters: bidArg, run: withBid((ws, b) => submittalChecklist(ws, b)) },
  draft_gc_email: {
    owner: "gc_follow_up",
    description: "Draft an email to the GC on a bid. purpose: plans, intent, decline or followup.",
    parameters: { type: "object", properties: { bid_id: { type: "string" }, purpose: { type: "string", enum: ["plans", "intent", "decline", "followup"] } }, required: ["bid_id", "purpose"] },
    run: withBid((ws, b, a) => gcEmail(ws, b, a.purpose as EmailPurpose)),
  },
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

function system(ws: TeamHolder, threadBot: BotId) {
  const c = getCompany(ws);
  const s = team(ws);
  const me = threadBot === "chief" ? "the main bot. You run the team and hand work to the specialist whose tools fit" : `${botName(ws, threadBot)}, a specialist on the team`;
  return [
    `You are ${botName(ws, threadBot)}, ${me}, working for ${c.name}, a commercial ${trade(ws).name.toLowerCase()} subcontractor. Today is ${today()}.`,
    `The team: ${s.bots.map((b) => `${b.name} (${b.role})`).join("; ")}.`,
    `You are talking with ${s.you.name}. ${s.you.about}`,
    s.facts.length ? `Things to remember: ${s.facts.map((f) => f.text).join("; ")}.` : "",
    `Service area: ${c.settings.serviceStates.join(", ")}. Minimum lead time: ${c.settings.minLeadDays} days. Weekly capacity: ${c.weeklyCapacity} bids.`,
    "Use the tools for facts about bids; never guess. Keep replies short and plain.",
    "Changes and anything that goes out are queued for the person's OK by the tools. Never claim something was sent or changed unless a tool said so.",
    "Sales owns price: never suggest a number. Never name the software, model or company behind you.",
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
  const tools = Object.entries(TOOLS).map(([name, x]) => ({ type: "function" as const, function: { name, description: `${x.description} (Skill of ${botName(ws, x.owner)}.)`, parameters: x.parameters } }));
  const blocks: Block[] = [];
  let from: BotId = threadBot;

  for (let step = 0; step < 6; step++) {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.MODEL_API_KEY}` },
      body: JSON.stringify({ model: process.env.MODEL_NAME, messages, tools }),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();
    const msg = data.choices?.[0]?.message as ChatMsg | undefined;
    if (!msg) throw new Error("empty reply");
    if (!msg.tool_calls?.length) return { from, text: msg.content?.trim() || "Done.", blocks, handoff: from !== threadBot };
    messages.push({ role: "assistant", content: msg.content ?? null, tool_calls: msg.tool_calls });
    for (const call of msg.tool_calls) {
      const tool = TOOLS[call.function.name];
      let out = "Unknown tool.";
      if (tool) {
        if (tool.owner !== "chief" && tool.owner !== from && !(tool.owner === "bid_desk" && from !== threadBot)) from = tool.owner;
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
