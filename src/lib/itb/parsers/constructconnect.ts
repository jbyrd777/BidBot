import { findDateAfter } from "../dates";
import { tradeScope, stateFrom } from "../scope";
import { contactFrom, extractLinks, flatten, projectSf } from "../text";
import type { InboundEmail, ParsedItb } from "../types";

/** ConstructConnect (iSqFt) invitations and reminders. */
export function parseConstructConnect(email: InboundEmail, text: string): ParsedItb {
  const flat = flatten(text);
  const ref = new Date(email.receivedAt);

  const headline = /received an invitation to bid on (.+?) from (.+?)(?= \d{2,6} [A-Z]| Bid Date|$)/i.exec(flat);
  const projectName =
    headline?.[1]?.trim() ??
    /Invitation to Bid on (.+?) (?:All Trades|Div \d)/i.exec(flat)?.[1]?.trim() ??
    email.subject.replace(/^(reminder|invitation to bid)\s*-\s*/i, "").replace(/\s*:\s*all trades$/i, "");
  const gcName = headline?.[2]?.trim() ?? email.fromName;

  // The street address sits right after the greeting line.
  const address = /from .+? (\d{2,6} [^.]+?, [A-Z][A-Za-z .]+, [A-Z]{2} \d{5})/.exec(flat)?.[1];

  const due = findDateAfter(flat, /Bid Date:?/i, ref);
  const startDate = findDateAfter(flat, /Start Date/i, ref);

  const trades = [...text.matchAll(/^\s*(\d{6}(?:\.\d+)?) - (.+)$/gm)].map((m) => `${m[1]} ${m[2].trim()}`);
  const description = /Description (.+?) (?:Note to Bidders|Contact )/.exec(flat)?.[1];
  const notes = /Note to Bidders (.+?) Contact /.exec(flat)?.[1];

  const contactSection = flat.slice(flat.lastIndexOf("Contact "));
  const contactName = /Name (.+?) Email/.exec(contactSection)?.[1];

  return {
    kind: /^\s*reminder/i.test(email.subject) || /second notice/i.test(flat) ? "reminder" : "invite",
    platform: "constructconnect",
    sourceId: email.id,
    receivedAt: email.receivedAt,
    projectName,
    gcName,
    contact: contactFrom(contactSection, contactName),
    location: address,
    state: stateFrom(address) ?? stateFrom(projectName),
    due,
    startDate,
    projectSf: projectSf(description ?? flat),
    scope: tradeScope(trades.join(" ") + " " + (description ?? "")),
    trades,
    links: extractLinks(text),
    description,
    notes,
  };
}
