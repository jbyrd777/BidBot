import type { Decision } from "@/lib/data/store";
import type { Recommendation } from "@/lib/itb/screen";

export type ChatRole = "user" | "assistant";

export interface ChatTurn {
  role: ChatRole;
  text: string;
}

/** A bid as the chat shows it: enough for a row, never the whole record. */
export interface BidCard {
  id: string;
  projectName: string;
  gc?: string;
  location?: string;
  due?: string;
  dueWhen: string;
  late: boolean;
  recommendation: Recommendation;
  reason: string;
  decision: Decision;
  scope: string[];
}

/** Rich pieces the chat renders under a reply. Nothing here has happened yet unless it says so. */
export type Block =
  | { type: "bids"; title: string; bids: BidCard[] }
  | { type: "confirm"; bid: BidCard; decision: Exclude<Decision, "pending">; why?: string }
  | { type: "email"; bid: BidCard; to?: string; subject: string; body: string };

export interface ChatReply {
  /** Which bot on the team answered. */
  from: string;
  text: string;
  blocks: Block[];
}
