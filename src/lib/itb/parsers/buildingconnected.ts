import { findDateAfter } from "../dates";
import { tradeScope, stateFrom, trimCountry } from "../scope";
import { contactFrom, extractLinks, flatten, projectSf } from "../text";
import type { InboundEmail, ItbKind, ParsedItb } from "../types";

const UPDATE_WORDS =
  /new bid due|revised bid due|due date (change|extend)|extension|addend|\brfi\b|site walk|job walk|walkthrough|photos|breakout|alternate|for award|updated|clarification|questions due/i;

export function parseBuildingConnected(email: InboundEmail, text: string): ParsedItb {
  const flat = flatten(text).replace(/^BuildingConnected\s*/i, "");
  const ref = new Date(email.receivedAt);

  let kind: ItbKind = "invite";
  let lead: string | undefined;
  let gc: string | undefined;
  let heading: string | undefined;
  let messageSubject: string | undefined;
  let messageBody: string | undefined;

  const invite = /^(.+?) from (.+?) has invited you to bid on (.+?) -{5,}/.exec(flat);
  const message = /^(.+?) of (.+?) sent your company a message about (.+?) -{5,} (.+?) -{5,} (.+?) Reply to\b/.exec(flat);

  if (invite) {
    [, lead, gc, heading] = invite;
  } else if (message) {
    [, lead, gc, heading, messageSubject, messageBody] = message;
    const isUpdate = UPDATE_WORDS.test(messageSubject) || UPDATE_WORDS.test(email.subject);
    const isInvite = /bid invitation|invit(e|ing) your (firm|company)/i.test(messageSubject + " " + messageBody);
    kind = isUpdate || !isInvite ? "update" : "invite";
    if (/reminder/i.test(messageSubject + email.subject)) kind = "reminder";
  } else {
    kind = /reminder/i.test(email.subject) ? "reminder" : "update";
  }

  // "Raising Cane's 1344 Burlington, WA: Tile" splits into project and package at the last colon.
  const split = heading ? heading.lastIndexOf(": ") : -1;
  const projectName = (split > 0 ? heading!.slice(0, split) : heading ?? email.subject).trim();
  const packageName = split > 0 ? heading!.slice(split + 2).trim() : undefined;

  const location = trimCountry(/Location: (.+?)(?= (?:Job Walk|Bid Due|Pre-?Bid|RFIs? Due|Start Date):| <div| View all)/.exec(flat)?.[1]);
  const details = flat.slice(flat.indexOf("Project Details"));
  const due = findDateAfter(details, /Bid Due:/i, ref) ?? findDateAfter(flat, /bid due|due (?:date|no later than)/i, ref);
  const jobWalk = findDateAfter(details, /Job Walk:/i, ref) ?? findDateAfter(flat, /site walk|job walk/i, ref, 120);
  const rfiDue = findDateAfter(flat, /RFIs? (?:are )?due:?/i, ref);

  const description = /(?:Bid Due|Job Walk): [A-Za-z]+ \d{1,2}, \d{4} (.+?) View all files/.exec(details)?.[1];

  const contactSection = flat.slice(Math.max(flat.indexOf("Client Details"), flat.indexOf("Sender Details")));
  // The sender's title sits between their name and the first bullet: "Jeremy Webb Project Manager • +1 425…".
  const leadName = lead?.trim();
  const afterName = leadName ? contactSection.split(leadName)[1] : undefined;
  const title = afterName ? /^\s*([A-Za-z][A-Za-z ,&/]+?)\s*•/.exec(afterName)?.[1] : undefined;
  const contact = contactFrom(contactSection, leadName, title);

  const rfpId = /\/rfps\/([a-f0-9]{16,})/.exec(text)?.[1];
  const recipientCompany = /know if (.+?) will bid on this RFP/.exec(flat)?.[1];

  const scopeText = [packageName, description, messageBody].filter(Boolean).join(" ");

  return {
    kind,
    platform: "buildingconnected",
    sourceId: email.id,
    receivedAt: email.receivedAt,
    projectName,
    packageName,
    externalRef: rfpId,
    gcName: gc?.trim(),
    contact,
    requestedBy: recipientCompany,
    location,
    state: stateFrom(location),
    due,
    jobWalk,
    rfiDue,
    projectSf: projectSf(flat),
    scope: tradeScope(scopeText),
    trades: packageName ? [packageName] : [],
    links: extractLinks(text),
    description: description?.replace(/\.\.\.$/, "…"),
    updateSummary: kind === "update" ? messageSubject ?? email.subject : undefined,
    notes: messageBody,
  };
}
