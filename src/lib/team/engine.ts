import type { SkillResult } from "./pack";
import { botName, change, getBot, post, remember, team, thread, waiting, type TeamHolder } from "./store";
import type { BotId } from "./types";
import { modelConfigured, modelTurn } from "./model";
import { routeDetailed } from "./router";

const has = (s: string, ...w: string[]) => w.some((x) => s.includes(x));

export { route } from "./router";

/** Built in handling, used until a language model is connected: the main bot here, specialists in the pack. */
function local(ws: TeamHolder, bot: BotId, text: string, threadBot: BotId): SkillResult {
  return bot === "chief" ? chief(ws, text, threadBot) : ws.pack.reply(ws, bot, text, threadBot);
}

function chief(ws: TeamHolder, text: string, threadBot: BotId): SkillResult {
  const s = text.toLowerCase();
  const m = text.match(/remember(?: that)?\s+(.+)/i);
  if (m) {
    remember(ws, m[1].replace(/[.]$/, ""), "chief");
    return { text: "Got it. Every bot on the team will use that.", blocks: [] };
  }
  if (has(s, "what do you know", "what do you remember")) {
    const facts = team(ws).facts;
    return { text: facts.length ? facts.map((f) => f.text).join("\n") : "Nothing saved yet. Tell me something to remember and every bot will use it.", blocks: [] };
  }
  const r = text.match(/(?:remind me to|add a task to|task:?|todo:?|to do:?)\s+(.+)/i);
  if (r) {
    return { text: "I can add that to your tasks.", blocks: [change(ws, "chief", threadBot, "create_task", `Add a task for you: ${r[1]}`, { title: r[1], owner: team(ws).you.name })] };
  }
  if (has(s, "waiting", "approval")) {
    const w = waiting(ws);
    return { text: w.length ? `${w.length} ${w.length === 1 ? "thing is" : "things are"} waiting for your OK:` : "Nothing is waiting for your OK.", blocks: w.map((a) => ({ type: "approval" as const, approvalId: a.id })) };
  }
  const roster = team(ws).bots.filter((b) => b.id !== "chief").map((b) => b.name).join(", ");
  return {
    text: `I run the team: ${roster}. Ask me anything about ${ws.pack.covers} and I will hand it to the right bot. I can also remember things for the whole team and keep your task list. Anything that changes data or goes out waits for your OK.`,
    blocks: [],
  };
}

/**
 * One turn of conversation. A message to the main bot is routed to the right specialist, who answers
 * in the same thread; a message in a specialist's own thread goes straight to that bot.
 */
export async function respond(ws: TeamHolder, threadBot: BotId, text: string, opts: { to?: BotId; repost?: boolean } = {}) {
  const t = thread(ws, threadBot);
  if (opts.repost !== false) post(ws, t, { from: "user", text, blocks: [] });

  if (modelConfigured() && !opts.to) {
    try {
      const r = await modelTurn(ws, threadBot, t);
      if (r.handoff && threadBot === "chief" && r.from !== "chief") post(ws, t, { from: "chief", text: "", blocks: [{ type: "handoff", to: r.from, note: `Passing this to ${botName(ws, r.from)}` }] });
      post(ws, t, { from: r.from, text: r.text, blocks: r.blocks });
      return t;
    } catch (e) {
      post(ws, t, { from: threadBot, text: "", blocks: [{ type: "notice", tone: "warn", text: `The language model did not answer (${(e as Error).message}). I answered with the built in skills instead.`, href: "/settings", cta: "Check settings" }] });
    }
  }

  let target: BotId = threadBot;
  if (threadBot === "chief") {
    if (opts.to && getBot(ws, opts.to)) target = opts.to;
    else {
      const r = routeDetailed(text, ws.pack);
      if (r.tie) {
        post(ws, t, {
          from: "chief",
          text: `This could go to ${botName(ws, r.bot)} or ${botName(ws, r.tie)}. Which one should take it?`,
          blocks: [{ type: "choices", text, options: [r.bot, r.tie].map((to) => ({ to, label: botName(ws, to) })) }],
        });
        return t;
      }
      target = r.bot;
    }
  }
  if (threadBot === "chief" && target !== "chief") post(ws, t, { from: "chief", text: "", blocks: [{ type: "handoff", to: target, note: `Passing this to ${botName(ws, target)}` }] });
  const r = local(ws, target, text, threadBot);
  post(ws, t, { from: target, text: r.text, blocks: r.blocks });
  return t;
}
