import { formatDue } from "@/components/labels";
import { addDays } from "@/lib/dashboard";
import type { Bid } from "@/lib/data/store";
import { today, trade } from "@/lib/data/store";
import { card, draftEmail, type EmailPurpose } from "@/lib/agent/ops";
import { addApproval, execute, getBot, thread } from "./store";
import type { BotId, Block } from "./types";

/**
 * What each specialist can do for one bid. Both responders call these, so a bot behaves the same
 * whether a language model is connected or not. Anything that changes data becomes an approval
 * unless the bot is set to run on its own.
 */

export interface SkillResult {
  text: string;
  blocks: Block[];
}

/** A change a bot wants to make: queued for an OK, or carried out now when the bot runs on its own. */
export function change(botId: BotId, threadBot: BotId, kind: "decide" | "create_task", summary: string, payload: Record<string, string>): Block {
  const bot = getBot(botId);
  const ap = addApproval({ botId, threadId: thread(threadBot).id, kind, summary, payload });
  if (bot?.autonomy === "auto") {
    ap.status = "done";
    ap.result = execute(ap);
  }
  return { type: "approval", approvalId: ap.id };
}

export function scopeSnapshot(b: Bid): SkillResult {
  const due = formatDue(b.due, today());
  const gaps = b.screen.reasons.filter((r) => /not|no |under|outside|missing/i.test(r));
  return {
    text: `Here is the scope snapshot for ${b.projectName}. It comes from the invitation only; the plans and specs are not in the system yet.`,
    blocks: [
      {
        type: "doc",
        title: `Scope snapshot: ${b.projectName}`,
        sections: [
          {
            heading: "Project",
            lines: [
              `GC: ${b.gcName ?? b.requestedBy ?? "Not stated"}`,
              `Location: ${b.location ?? "Not stated"}`,
              `Size: ${b.projectSf ? `${b.projectSf.toLocaleString()} SF` : "Not stated"}`,
              `Bid due: ${b.due ? `${due.date} (${due.when.toLowerCase()})` : "Not stated"}`,
            ],
          },
          { heading: `${trade().name} scope named`, lines: b.scope.length ? b.scope : [`The invitation does not name the ${trade().noun} scope`] },
          { heading: "Gaps to close", lines: [...gaps, `Plans and ${trade().noun} specs not received`] },
        ],
      },
      { type: "notice", tone: "info", text: "Forward the plan set, or connect your drive in the Vault, and I will read the finish schedule and specs.", href: "/vault", cta: "Open the Vault" },
    ],
  };
}

export function requestTakeoff(b: Bid, threadBot: BotId): SkillResult {
  const due = b.due ? addDays(b.due.date, -2) : undefined;
  return {
    text: `I can put the takeoff for ${b.projectName} in the estimating queue${due ? `, due ${formatDue({ date: due, raw: "" }, today()).date}, two days ahead of the bid` : ""}.`,
    blocks: [change("takeoff_coordinator", threadBot, "create_task", `Add a takeoff for ${b.projectName} to the estimating queue`, { title: `Takeoff: ${b.projectName}`, owner: "Estimating", bidId: b.id, due: due ?? "" })],
  };
}

export function draftRfq(b: Bid): SkillResult {
  const lines = b.scope.length ? b.scope.map((s) => `${s}: quantity to follow from the takeoff`) : ["Scope items: to follow once the plans are read"];
  const body = [
    "Hello,",
    `We are pricing ${b.projectName}${b.location ? ` in ${b.location}` : ""} and would like your pricing and lead times on the following:`,
    lines.join("\n"),
    b.due ? `Our bid is due ${formatDue(b.due, today()).date}, so pricing a few days ahead of that helps.` : "Please include lead times with your pricing.",
    "Thank you",
  ].join("\n\n");
  return {
    text: `Here is an RFQ draft for ${b.projectName}. It has no vendor on it yet because no distributor contacts are connected.`,
    blocks: [
      { type: "email", bid: card(b), subject: `RFQ: ${b.scope.join(", ") || trade().noun} for ${b.projectName}`, body },
      { type: "notice", tone: "info", text: "Connect your CRM or contacts in the Vault and I will address RFQs to your usual distributors.", href: "/vault", cta: "Open the Vault" },
    ],
  };
}

export function draftProposal(b: Bid): SkillResult {
  return {
    text: `Here is a proposal outline for ${b.projectName}. The inclusions and exclusions are a starter list; edit them to your standard language. Sales sets the price.`,
    blocks: [
      {
        type: "doc",
        title: `Proposal outline: ${b.projectName}`,
        sections: [
          { heading: "Prepared for", lines: [b.gcName ?? b.requestedBy ?? "GC", b.location ?? ""] },
          { heading: "Scope of work", lines: b.scope.length ? b.scope.map((s) => `Furnish and install ${s.toLowerCase()} per plans and specs`) : [`${trade().name} scope to be confirmed from the plans`] },
          { heading: "Starter inclusions", lines: ["Labor, material and equipment for the scope above", "Cleanup of our work areas", "Manufacturer standard warranty"] },
          { heading: "Starter exclusions", lines: ["Permits and fees unless listed", "Work by other trades", "After hours work"] },
          { heading: "Price", lines: ["Set by sales"] },
        ],
      },
    ],
  };
}

export function submittalChecklist(b: Bid): SkillResult {
  const types = b.scope.length ? b.scope : ["Each product"];
  const items = types.flatMap((t) => [`${t}: product data sheet`, `${t}: installation instructions`, `${t}: warranty`, `${t}: samples for color selection`]);
  items.push(...trade().submittalExtras);
  return { text: `Submittal checklist for ${b.projectName}. I will fill it in once the products are selected.`, blocks: [{ type: "checklist", title: `Submittals: ${b.projectName}`, items }] };
}

export function gcEmail(b: Bid, purpose: EmailPurpose): SkillResult {
  const d = draftEmail(b, purpose);
  return {
    text: `Here is a draft to ${b.contact?.name ?? b.gcName ?? "the GC"}. Edit it, then send it from your mail. Connect Gmail or Outlook in the Vault and I can send it after your OK.`,
    blocks: [{ type: "email", bid: card(b), ...d }],
  };
}

export function decisionCard(b: Bid, decision: "bid" | "no_bid", threadBot: BotId): Block {
  return change("bid_desk", threadBot, "decide", `Mark ${b.projectName} as ${decision === "bid" ? "bidding" : "not bidding"}`, { bidId: b.id, decision });
}
