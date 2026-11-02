import { findDate, findDateAfter } from "../dates";
import { tradeScope, placeInProse, stateFrom } from "../scope";
import { cleanSubject, companyFromDomain, contactFrom, extractLinks, flatten, projectSf } from "../text";
import type { InboundEmail, ParsedItb } from "../types";

const DUE_LABELS = /(?:quote|bid|proposal)s?\s+due(?:\s+date)?\s*:?|due date\s*:|bids? (?:are )?due|due no later than|due by/i;

/** Invitations a GC sends straight from their own inbox, with no bid platform in between. */
export function parseDirect(email: InboundEmail, text: string): ParsedItb {
  const flat = flatten(text);
  const ref = new Date(email.receivedAt);

  const labelled = (label: RegExp) => new RegExp(`(?:${label.source})\\s*:?\\s*(.+?)(?=\\s{2,}|\\n|$)`, "im").exec(text)?.[1]?.trim();

  const projectName = labelled(/^\s*Project(?! Type| Links)/) ?? cleanSubject(email.subject);
  const address = labelled(/Site Address|Project Address|Address|Location/);
  const location = address ?? placeInProse(flat) ?? (stateFrom(projectName) ? projectName.split(" - ").pop() : undefined);

  const due = findDateAfter(flat, DUE_LABELS, ref) ?? (/\bdue\b/i.test(email.subject) ? findDate(email.subject, ref) : undefined);
  const scopeLine = /bid on the (.+?) scope/i.exec(flat)?.[1];

  // The sender's signature: name on one line, title on the next.
  const fromName = email.fromName?.trim();
  const signature = fromName ? text.slice(text.lastIndexOf(fromName)) : "";
  const title = signature.split("\n").map((l) => l.trim()).filter(Boolean)[1];

  return {
    kind: /^\s*re:/i.test(email.subject) ? "update" : "invite",
    platform: "direct",
    sourceId: email.id,
    receivedAt: email.receivedAt,
    projectName,
    gcName: companyFromDomain(email.fromAddress, text),
    contact: contactFrom(signature || flat, fromName, title && title.length < 60 ? title : undefined) ?? {
      name: fromName,
      email: email.fromAddress,
    },
    location,
    state: stateFrom(location) ?? stateFrom(projectName),
    due,
    projectSf: projectSf(flat),
    scope: tradeScope(scopeLine ?? flat),
    trades: scopeLine ? [scopeLine] : [],
    links: extractLinks(text),
    description: labelled(/Project Type/),
  };
}
