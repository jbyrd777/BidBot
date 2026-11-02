import Anthropic from "@anthropic-ai/sdk";
import { getBid, getCompany, today, type Decision } from "@/lib/data/store";
import { card, draftEmail, searchBids, type EmailPurpose } from "./ops";
import type { Block, ChatReply, ChatTurn } from "./types";

/**
 * The model responder. Runs only when CHAT_API_KEY is set. It reads through the same operations as the
 * built-in responder, and its only "write" tools return proposals the person confirms in the chat.
 */

const TOOLS: Anthropic.Tool[] = [
  {
    name: "search_bids",
    description: "List bids on the board. All filters optional. Returns compact rows with id, project, GC, location, due, first read and current call.",
    input_schema: {
      type: "object",
      properties: {
        decision: { type: "string", enum: ["pending", "bid", "no_bid", "all"], description: "pending means undecided" },
        recommendation: { type: "string", enum: ["bid", "review", "no_bid"], description: "first read: bid = looks like a bid, review = needs a look, no_bid = likely pass" },
        due_within_days: { type: "number", description: "0 = today, 6 = this week" },
        text: { type: "string", description: "match on project, GC, city or state" },
        outside_service_area: { type: "boolean" },
      },
    },
  },
  {
    name: "get_bid",
    description: "Full detail for one bid by id: dates, scope, contact, links, description and the screening reasons.",
    input_schema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
  },
  {
    name: "propose_decision",
    description: "Put a bid or pass call in front of the person as a confirm card. This does not change the board; the person confirms.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" }, decision: { type: "string", enum: ["bid", "no_bid"] }, why: { type: "string" } },
      required: ["id", "decision"],
    },
  },
  {
    name: "draft_email",
    description: "Show an email draft to the GC for one bid. The person edits and sends it from their own mail; nothing is sent from here.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        purpose: { type: "string", enum: ["plans", "intent", "decline", "followup"] },
        subject: { type: "string", description: "optional; a default is written for the purpose" },
        body: { type: "string", description: "optional; a default is written for the purpose" },
      },
      required: ["id", "purpose"],
    },
  },
];

function system() {
  const c = getCompany();
  return [
    `You are Bid Desk, the bid intake member of a bot team working for ${c.name}, a commercial flooring contractor. Today is ${today()}.`,
    `The service area is ${c.settings.serviceStates.join(", ")}. The minimum lead time is ${c.settings.minLeadDays} days. Weekly capacity is ${c.weeklyCapacity} bids.`,
    "Answer from the tools, never from memory. Keep replies short and plain. Name bids by project name.",
    "You cannot change the board or send anything. To make a call, use propose_decision; to write to a GC, use draft_email. The person confirms or sends.",
    "Sales owns price: never suggest a number. Never mention the software, model or company behind you; you are Bid Desk.",
  ].join("\n");
}

async function runTool(name: string, input: Record<string, unknown>, blocks: Block[]): Promise<string> {
  if (name === "search_bids") {
    const bids = searchBids({
      decision: input.decision as Decision | "all" | undefined,
      recommendation: input.recommendation as "bid" | "review" | "no_bid" | undefined,
      dueWithinDays: input.due_within_days as number | undefined,
      text: input.text as string | undefined,
      outsideServiceArea: input.outside_service_area as boolean | undefined,
    });
    if (bids.length) blocks.push({ type: "bids", title: "Bids", bids: bids.map(card) });
    return JSON.stringify(bids.map((b) => ({ ...card(b), state: b.state })));
  }
  const bid = getBid(String(input.id));
  if (!bid) return JSON.stringify({ error: "No bid with that id. Use search_bids first." });
  if (name === "get_bid") {
    const { events, ...rest } = bid;
    return JSON.stringify({ ...rest, history: events.map((e) => `${e.at.slice(0, 10)} ${e.summary}`) });
  }
  if (name === "propose_decision") {
    blocks.push({ type: "confirm", bid: card(bid), decision: input.decision as "bid" | "no_bid", why: input.why as string | undefined });
    return "Shown to the person as a confirm card.";
  }
  if (name === "draft_email") {
    const d = draftEmail(bid, input.purpose as EmailPurpose);
    blocks.push({ type: "email", bid: card(bid), to: d.to, subject: (input.subject as string) || d.subject, body: (input.body as string) || d.body });
    return "Draft shown to the person.";
  }
  return JSON.stringify({ error: "Unknown tool" });
}

export function modelEnabled() {
  return !!process.env.CHAT_API_KEY;
}

export async function modelReply(history: ChatTurn[]): Promise<ChatReply> {
  const client = new Anthropic({ apiKey: process.env.CHAT_API_KEY, baseURL: process.env.CHAT_BASE_URL || undefined });
  const messages: Anthropic.MessageParam[] = history.map((t) => ({ role: t.role, content: t.text }));
  const blocks: Block[] = [];
  let from = "Bid Desk";

  for (let step = 0; step < 6; step++) {
    const res = await client.messages.create({
      model: process.env.CHAT_MODEL || "claude-sonnet-5-5",
      max_tokens: 1200,
      system: system(),
      tools: TOOLS,
      messages,
    });
    const uses = res.content.filter((c): c is Anthropic.ToolUseBlock => c.type === "tool_use");
    if (!uses.length || res.stop_reason !== "tool_use") {
      const text = res.content.filter((c): c is Anthropic.TextBlock => c.type === "text").map((c) => c.text).join("\n").trim();
      return { from, text: text || "Done.", blocks };
    }
    messages.push({ role: "assistant", content: res.content });
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const u of uses) {
      if (u.name === "draft_email") from = "GC Follow Up";
      results.push({ type: "tool_result", tool_use_id: u.id, content: await runTool(u.name, u.input as Record<string, unknown>, blocks) });
    }
    messages.push({ role: "user", content: results });
  }
  return { from, text: "That took more steps than I allow for one question. Try asking it in two parts.", blocks };
}
