import type { BotKind } from "@/lib/bots/roster";
import type { Block as BidBlock } from "@/lib/agent/types";

export type BotId = "chief" | BotKind;

/** ask: every change waits for an OK. auto: changes inside the app run on their own; sending and paying still ask. */
export type Autonomy = "ask" | "auto";

export interface TeamBot {
  id: BotId;
  name: string;
  role: string;
  status: "live" | "review" | "off";
  autonomy: Autonomy;
  /** Connected apps this bot may use, by app key. */
  access: string[];
}

export type ApprovalKind = "decide" | "create_task" | "send_email";

export interface Approval {
  id: string;
  at: string;
  botId: BotId;
  threadId: string;
  kind: ApprovalKind;
  /** One line, in plain words, of what will happen. */
  summary: string;
  payload: Record<string, string>;
  status: "waiting" | "done" | "declined";
  result?: string;
}

export interface TaskItem {
  id: string;
  at: string;
  title: string;
  owner: string;
  bidId?: string;
  due?: string;
  status: "open" | "done";
}

export interface Fact {
  id: string;
  at: string;
  text: string;
  botId: BotId;
}

/** Everything a message can carry under its text. */
export type Block =
  | BidBlock
  | { type: "handoff"; to: BotId; note: string }
  | { type: "approval"; approvalId: string }
  | { type: "doc"; title: string; sections: { heading: string; lines: string[] }[] }
  | { type: "checklist"; title: string; items: string[] }
  | { type: "notice"; tone: "info" | "warn"; text: string; href?: string; cta?: string };

export interface Message {
  id: string;
  at: string;
  from: "user" | BotId;
  text: string;
  blocks: Block[];
}

export interface Thread {
  id: string;
  botId: BotId;
  messages: Message[];
}

export interface TeamState {
  bots: TeamBot[];
  threads: Thread[];
  approvals: Approval[];
  tasks: TaskItem[];
  facts: Fact[];
  you: { name: string; about: string };
}
