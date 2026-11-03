import type { supabaseServer } from "@/lib/supabase/server";
import type { TeamHolder } from "./store";
import type { Approval, Block, BotId } from "./types";

/**
 * An industry pack: everything that makes the team fit one kind of business. The core (workspaces,
 * people, the bot team, chat, approvals, tasks and memory) knows nothing about any industry; it asks the
 * workspace's pack for the bots, how to route a request, what each bot can do and where the pack's own
 * records live. Adding an industry is adding a pack in `src/packs` and registering it in `src/packs/index.ts`.
 */

export interface SkillResult {
  text: string;
  blocks: Block[];
}

/** Weighted phrases that point a request at one bot. */
export type Signals = [RegExp, number][];

export interface PackBot {
  id: BotId;
  name: string;
  role: string;
}

export interface PackTool<W extends TeamHolder = TeamHolder> {
  owner: BotId;
  description: string;
  parameters: Record<string, unknown>;
  /** Tools any bot may call while helping; they do not take the reply over from another specialist. */
  shared?: boolean;
  run: (ws: W, args: Record<string, string>, threadBot: BotId, blocks: Block[]) => string;
}

type Changes = NonNullable<TeamHolder["changes"]>;
type Db = Awaited<ReturnType<typeof supabaseServer>>;

export interface IndustryPack<W extends TeamHolder = TeamHolder, S = unknown> {
  key: string;
  name: string;
  /** The main bot's default name and role; the company can rename it. */
  mainBot: { name: string; role: string };
  /** The specialists every workspace on this pack starts with, in display order. */
  roster: PackBot[];
  /** Routing signals per specialist, used for requests to the main bot when no model is connected. */
  signals: Record<BotId, Signals>;
  /** Where a request lands when nothing matches. */
  fallbackBot: BotId;
  /** What the team covers, as the main bot says it: "your bids, scope, takeoffs ...". */
  covers: string;

  /** A specialist's built in answer, used until a language model is connected. */
  reply: (ws: W, bot: BotId, text: string, threadBot: BotId) => SkillResult;
  /** Tools the language model may call, each owned by one bot. */
  tools: Record<string, PackTool<W>>;
  /** Who the company is, for the model: "Acme Flooring, a commercial flooring subcontractor". */
  about: (ws: W) => string;
  /** The pack's working rules for the model, one line each. */
  rules: (ws: W) => string[];
  /** Carry out an approved change of a kind the pack owns. Undefined when the kind is not the pack's. */
  execute: (ws: W, a: Approval) => string | undefined;

  /** The pack's records for the local demo workspace. */
  demo: () => S;
  /** Load the pack's records for one workspace, under the signed in person's session. */
  load: (sb: Db, workspace: Record<string, unknown>) => Promise<S>;
  /** Save the pack's changed records. Throws with a plain message when a write fails. */
  save: (sb: Db, ws: W, changes: Changes, by: string) => Promise<void>;
}

/** Any pack, whatever its records: what the core holds and passes around. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyPack = IndustryPack<any, any>;
