export type Platform =
  | "buildingconnected"
  | "constructconnect"
  | "procore"
  | "direct"
  | "client_batch";

/** invite: a new invitation. update: news about an existing bid. reminder: a nudge. batch_item: one job from a client's list. */
export type ItbKind = "invite" | "update" | "reminder" | "batch_item";

export interface InboundEmail {
  id: string;
  subject: string;
  fromName?: string;
  fromAddress: string;
  to?: string[];
  receivedAt: string; // ISO
  text?: string;
  html?: string;
}

export interface DueDate {
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM, 24 hour
  tz?: string;
  raw: string;
}

export interface Contact {
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
}

export interface ItbLink {
  label: string;
  url: string;
}

export interface ParsedItb {
  kind: ItbKind;
  platform: Platform;
  sourceId: string;
  receivedAt: string;
  projectName: string;
  packageName?: string;
  externalRef?: string;
  gcName?: string;
  contact?: Contact;
  requestedBy?: string;
  forwardedBy?: string;
  location?: string;
  state?: string;
  due?: DueDate;
  jobWalk?: DueDate;
  rfiDue?: DueDate;
  startDate?: DueDate;
  projectSf?: number;
  scope: string[];
  trades: string[];
  links: ItbLink[];
  description?: string;
  notes?: string;
  /** What changed, for updates. */
  updateSummary?: string;
}
