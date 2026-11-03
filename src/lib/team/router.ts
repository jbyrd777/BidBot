import type { IndustryPack, Signals } from "./pack";
import type { BotId } from "./types";

/**
 * Picks the bot for a request without a language model. Each bot has weighted signals; the request is
 * scored against all of them, so wording that misses one phrase still lands through the others.
 * When two bots score close together, the main bot asks instead of guessing.
 */

/** Signals for a set of words or patterns, matched at the start of a word. */
export const w = (weight: number, ...words: string[]): Signals => words.map((x) => [new RegExp(`\\b${x}`, "i"), weight]);

/** The main bot's own requests: memory, tasks and approvals. Every pack shares these. */
const CHIEF: Signals = [...w(3, "remember", "forget", "what do you know", "remind", "todo", "to do list", "what can you", "who are you", "approv", "waiting for (my|your) ok"), ...w(2, "task", "help", "my list"), ...w(1, "team")];

export interface RouteResult {
  bot: BotId;
  /** Close runner up, when the request could fairly belong to either. */
  tie?: BotId;
  scores: Partial<Record<BotId, number>>;
}

export function routeDetailed(text: string, pack: Pick<IndustryPack, "signals" | "fallbackBot">): RouteResult {
  const s = ` ${text.toLowerCase()} `;
  const scores: Partial<Record<BotId, number>> = {};
  for (const [bot, signals] of Object.entries({ chief: CHIEF, ...pack.signals })) {
    const score = signals.reduce((n, [re, weight]) => n + (re.test(s) ? weight : 0), 0);
    if (score) scores[bot] = score;
  }
  const ranked = (Object.entries(scores) as [BotId, number][]).sort((a, b) => b[1] - a[1]);
  if (!ranked.length) return { bot: pack.fallbackBot, scores };
  const [[top, a], second] = ranked;
  // The main bot's own requests (memory, tasks, approvals) win outright; they are about the team, not the work.
  if (top === "chief" && a >= 3) return { bot: "chief", scores };
  const tie = second && second[0] !== "chief" && a >= 3 && second[1] >= 3 && a - second[1] <= 1 ? second[0] : undefined;
  return { bot: top, tie, scores };
}

export function route(text: string, pack: Pick<IndustryPack, "signals" | "fallbackBot">): BotId {
  return routeDetailed(text, pack).bot;
}
