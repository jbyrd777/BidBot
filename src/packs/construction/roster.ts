export type BotKind =
  | "bid_desk"
  | "scope_analyst"
  | "takeoff_coordinator"
  | "vendor_rfq"
  | "proposal_builder"
  | "gc_follow_up"
  | "submittals";

export type BotStatus = "live" | "review" | "off";

export interface BotDef {
  kind: BotKind;
  name: string;
  role: string;
  owns: string;
  channels: ("email" | "phone" | "text" | "slack")[];
  checkpoint: string;
  status: BotStatus;
}

/** The default team every subcontractor starts with. Names and status are company settings. */
export const DEFAULT_ROSTER: BotDef[] = [
  {
    kind: "bid_desk",
    name: "Bid Desk",
    role: "Reads every invitation, pulls out the dates and scope, and screens it against your rules",
    owns: "Bid inbox and bid platforms",
    channels: ["email", "slack"],
    checkpoint: "Estimating lead makes the bid or no bid call",
    status: "live",
  },
  {
    kind: "scope_analyst",
    name: "Scope Analyst",
    role: "Writes the go or no go snapshot and the full scope report from the plans and specs",
    owns: "Plan and spec sets",
    channels: ["email"],
    checkpoint: "Estimator reviews flagged risks",
    status: "off",
  },
  {
    kind: "takeoff_coordinator",
    name: "Takeoff Coordinator",
    role: "Routes plans to estimators, tracks progress and returns quantities to sales",
    owns: "Takeoff queue",
    channels: ["email", "slack"],
    checkpoint: "Estimator signs off quantities",
    status: "off",
  },
  {
    kind: "vendor_rfq",
    name: "Vendor RFQ",
    role: "Drafts RFQs from the takeoff, sends them from your email and logs the pricing that comes back",
    owns: "Manufacturer and distributor contacts",
    channels: ["email", "phone"],
    checkpoint: "Sales approves each RFQ before it goes out",
    status: "off",
  },
  {
    kind: "proposal_builder",
    name: "Proposal Builder",
    role: "Assembles the proposal with inclusions, exclusions and alternates once sales sets the price",
    owns: "Proposal templates",
    channels: ["email"],
    checkpoint: "Sales sets the price and approves",
    status: "off",
  },
  {
    kind: "gc_follow_up",
    name: "GC Follow Up",
    role: "Confirms receipt, chases bid results and keeps GC contacts current",
    owns: "GC relationships",
    channels: ["phone", "email", "text"],
    checkpoint: "Sales owns the relationship",
    status: "off",
  },
  {
    kind: "submittals",
    name: "Submittals",
    role: "Pulls data sheets and warranties and assembles submittal packages after award",
    owns: "Product data library",
    channels: ["email"],
    checkpoint: "Project manager approves each package",
    status: "off",
  },
];
