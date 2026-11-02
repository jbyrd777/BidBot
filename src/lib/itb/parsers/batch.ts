import { findDate } from "../dates";
import { stateMentioned } from "../scope";
import { companyFromDomain } from "../text";
import type { InboundEmail, ParsedItb } from "../types";

// "333863 Mobility Hub Coral Gables iGMP / Jake – 10 floors"
const JOB_LINE = /^\s*(?:\d+\.\s*)?(\d{5,7})\s+(.+?)\s*\/\s*([A-Z][\w ]{0,20}?)\s*(?:[–-]\s*(.+))?$/;

export function looksLikeBatch(text: string): boolean {
  return text.split("\n").filter((l) => JOB_LINE.test(l)).length >= 2;
}

/** A client's list of several jobs in one email, each with a job number and an owner. */
export function parseBatch(email: InboundEmail, text: string): ParsedItb[] {
  const ref = new Date(email.receivedAt);
  const client = companyFromDomain(email.fromAddress, text);
  const note = text.split("\n").filter((l) => !JOB_LINE.test(l)).join(" ");
  const state = stateMentioned(note);
  let due = undefined as ReturnType<typeof findDate>;
  const items: ParsedItb[] = [];

  for (const line of text.split("\n")) {
    const heading = /^\s*due\s+(.+)$/i.exec(line);
    if (heading) {
      due = findDate(heading[1], ref);
      continue;
    }
    const m = JOB_LINE.exec(line);
    if (!m) continue;
    const [, jobNumber, name, owner, note] = m;
    items.push({
      kind: "batch_item",
      platform: "client_batch",
      sourceId: `${email.id}#${jobNumber}`,
      receivedAt: email.receivedAt,
      projectName: name.trim(),
      externalRef: jobNumber,
      requestedBy: client,
      contact: { name: email.fromName, email: email.fromAddress },
      due,
      state,
      location: state ? `${state}, per the client's note` : undefined,
      scope: [],
      trades: [],
      links: [],
      notes: [`Owner at client: ${owner.trim()}`, note?.trim()].filter(Boolean).join(". "),
    });
  }
  return items;
}
