import { findDateAfter } from "../dates";
import { tradeScope, activeTrade, placeInProse, stateFrom } from "../scope";
import { contactFrom, extractLinks, flatten, projectSf } from "../text";
import type { InboundEmail, ParsedItb } from "../types";

/** Procore bid invitations, often forwarded by a client or a colleague. */
export function parseProcore(email: InboundEmail, text: string): ParsedItb {
  const flat = flatten(text);
  const ref = new Date(email.receivedAt);

  const head = /(.+?) from (.+?) has invited you to bid on project (.+?)(?: \(\))?\./.exec(
    flat.slice(flat.search(/Invitation to Bid/i)),
  );
  const lead = head?.[1]?.replace(/^.*Invitation to Bid\s*/i, "").trim();
  const gcName = head?.[2]?.trim();
  const projectName =
    /Project Name (.+?) Bid Package Name/.exec(flat)?.[1]?.trim() ?? head?.[3]?.trim() ?? email.subject;
  const packageName = /Bid Package Name (.+?) (?:Bid Form Name|Project Description)/.exec(flat)?.[1]?.trim();

  const description = /Project Description (.+?) (?:Instructions for Bidding|Client Details)/.exec(flat)?.[1];
  const instructions = /Instructions for Bidding (.+?) Client Details/.exec(flat)?.[1] ?? "";
  const due =
    findDateAfter(flat, /(?:bid )?due(?: date)?:|up until|no later than|bids? (?:are )?due/i, ref) ??
    findDateAfter(description ?? "", /until|by/i, ref);

  // Only our trade's part of an all trades scope list matters. Procore lists each trade by name.
  const label = activeTrade().name.split(" ")[0];
  const others = ["Flooring", "FRP", "Painting", "Drywall", "Specialties", "Millwork", "Doors", "Electrical", "Plumbing", "Mechanical", "HVAC", "Fire", "Roofing", "Glazing", "Concrete", "Masonry"].filter((t) => t !== label);
  const flooringBlock = new RegExp(`${label} (.+?)(?= (?:${others.join("|")})\\b|$)`).exec(instructions)?.[1] ?? "";
  const location = placeInProse(description ?? "") ?? placeInProse(flat);

  const contactSection = flat.slice(flat.indexOf("Client Details"));
  const forwardedBy = /^(re|fw|fwd):/i.test(email.subject) ? email.fromName ?? email.fromAddress : undefined;

  return {
    kind: "invite",
    platform: "procore",
    sourceId: email.id,
    receivedAt: email.receivedAt,
    projectName,
    packageName,
    gcName,
    contact: contactFrom(contactSection, lead),
    forwardedBy,
    location,
    state: stateFrom(location),
    due,
    projectSf: projectSf(description ?? ""),
    scope: tradeScope(flooringBlock || instructions),
    trades: flooringBlock ? [activeTrade().name] : [],
    links: extractLinks(text),
    description,
  };
}
