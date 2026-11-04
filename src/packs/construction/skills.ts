import { formatDue } from "@/components/labels";
import type { SkillResult } from "@/lib/team/pack";
import { providerOn } from "@/lib/providers";
import { change } from "@/lib/team/store";
import type { BotId, Block } from "@/lib/team/types";
import { card, draftEmail, type EmailPurpose } from "./agent/ops";
import { addDays } from "./dashboard";
import { today, trade, type Bid, type ConstructionWs } from "./store";

/**
 * What each specialist can do for one bid. Both responders call these, so a bot behaves the same
 * whether a language model is connected or not. Anything that changes data becomes an approval
 * unless the bot is set to run on its own.
 */

export function scopeSnapshot(ws: ConstructionWs, b: Bid): SkillResult {
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
          { heading: `${trade(ws).name} scope named`, lines: b.scope.length ? b.scope : [`The invitation does not name the ${trade(ws).noun} scope`] },
          { heading: "Gaps to close", lines: [...gaps, `Plans and ${trade(ws).noun} specs not received`] },
        ],
      },
      { type: "notice", tone: "info", text: "Forward the plan set, or connect your drive in the Vault, and I will read the finish schedule and specs.", href: "/vault", cta: "Open the Vault" },
    ],
  };
}

export function requestTakeoff(ws: ConstructionWs, b: Bid, threadBot: BotId): SkillResult {
  const due = b.due ? addDays(b.due.date, -2) : undefined;
  return {
    text: `I can put the takeoff for ${b.projectName} in the estimating queue${due ? `, due ${formatDue({ date: due, raw: "" }, today()).date}, two days ahead of the bid` : ""}.`,
    blocks: [change(ws, "takeoff_coordinator", threadBot, "create_task", `Add a takeoff for ${b.projectName} to the estimating queue`, { title: `Takeoff: ${b.projectName}`, owner: "Estimating", ref: b.id, due: due ?? "" })],
  };
}

export function draftRfq(ws: ConstructionWs, b: Bid): SkillResult {
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
      { type: "email", bid: card(b), subject: `RFQ: ${b.scope.join(", ") || trade(ws).noun} for ${b.projectName}`, body },
      { type: "notice", tone: "info", text: "Connect your CRM or contacts in the Vault and I will address RFQs to your usual distributors.", href: "/vault", cta: "Open the Vault" },
    ],
  };
}

export function draftProposal(ws: ConstructionWs, b: Bid): SkillResult {
  return {
    text: `Here is a proposal outline for ${b.projectName}. The inclusions and exclusions are a starter list; edit them to your standard language. Sales sets the price.`,
    blocks: [
      {
        type: "doc",
        title: `Proposal outline: ${b.projectName}`,
        sections: [
          { heading: "Prepared for", lines: [b.gcName ?? b.requestedBy ?? "GC", b.location ?? ""] },
          { heading: "Scope of work", lines: b.scope.length ? b.scope.map((s) => `Furnish and install ${s.toLowerCase()} per plans and specs`) : [`${trade(ws).name} scope to be confirmed from the plans`] },
          { heading: "Starter inclusions", lines: ["Labor, material and equipment for the scope above", "Cleanup of our work areas", "Manufacturer standard warranty"] },
          { heading: "Starter exclusions", lines: ["Permits and fees unless listed", "Work by other trades", "After hours work"] },
          { heading: "Price", lines: ["Set by sales"] },
        ],
      },
    ],
  };
}

export function submittalChecklist(ws: ConstructionWs, b: Bid): SkillResult {
  const types = b.scope.length ? b.scope : ["Each product"];
  const items = types.flatMap((t) => [`${t}: product data sheet`, `${t}: installation instructions`, `${t}: warranty`, `${t}: samples for color selection`]);
  items.push(...trade(ws).submittalExtras);
  return { text: `Submittal checklist for ${b.projectName}. I will fill it in once the products are selected.`, blocks: [{ type: "checklist", title: `Submittals: ${b.projectName}`, items }] };
}

export function gcEmail(ws: ConstructionWs, b: Bid, purpose: EmailPurpose): SkillResult {
  const d = draftEmail(ws, b, purpose);
  return {
    text: `Here is a draft to ${b.contact?.name ?? b.gcName ?? "the GC"}. Edit it, then send it from your mail. Connect Gmail or Outlook in the Vault and I can send it after your OK.`,
    blocks: [{ type: "email", bid: card(b), ...d }],
  };
}

export function decisionCard(ws: ConstructionWs, b: Bid, decision: "bid" | "no_bid", threadBot: BotId): Block {
  return change(ws, "bid_desk", threadBot, "decide", `Mark ${b.projectName} as ${decision === "bid" ? "bidding" : "not bidding"}`, { bidId: b.id, decision });
}

/** Download a bid's plans, specs and addenda on the company's computer. Needs an OK unless the bot runs on its own. */
export function fetchPlans(ws: ConstructionWs, b: Bid, threadBot: BotId): SkillResult {
  if (!providerOn("computers")) {
    return {
      text: `I download plans on the team's computer, and none is set up yet. Until then, the plan links for ${b.projectName} are on the bid.`,
      blocks: [{ type: "notice", tone: "info", text: "Add a computer key in Settings and I can pull plan sets for you, overnight if you like.", href: "/settings", cta: "Open Settings" }],
    };
  }
  if (!b.links.length) {
    return { text: `The invitation for ${b.projectName} has no plan link. Paste the link to the plans and I will download them on the computer.`, blocks: [] };
  }
  const folder = `~/Plans/${b.id}`;
  const task = [
    `Download the full plan set, the specifications and every addendum for the project "${b.projectName}"${b.gcName ? ` from ${b.gcName}` : ""}.`,
    `Start from these links: ${b.links.map((l) => `${l.label}: ${l.url}`).join("; ")}.`,
    `Save everything in ${folder}, keeping the site's file names.`,
    `When you finish, list the files you saved with their sizes, and say whether the ${trade(ws).noun} finish schedule or specs were among them.`,
  ].join(" ");
  const sites = [...new Set(b.links.map((l) => l.label))].join(" and ");
  return {
    text: `I can download the plans for ${b.projectName} from ${sites} on the computer. If ${sites} needs you signed in, I will ask you to sign in yourself first.`,
    blocks: [change(ws, "scope_analyst", threadBot, "computer_job", `Download the plans for ${b.projectName} on the computer`, { title: `Plans for ${b.projectName}`, task, ref: b.id })],
  };
}
