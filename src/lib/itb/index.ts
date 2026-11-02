import { looksLikeBatch, parseBatch } from "./parsers/batch";
import { parseBuildingConnected } from "./parsers/buildingconnected";
import { parseConstructConnect } from "./parsers/constructconnect";
import { parseDirect } from "./parsers/direct";
import { parseProcore } from "./parsers/procore";
import { bodyText } from "./text";
import type { InboundEmail, ParsedItb, Platform } from "./types";

export * from "./types";

export function detectPlatform(email: InboundEmail, text: string): Platform {
  const from = email.fromAddress.toLowerCase();
  if (from.includes("buildingconnected") || /^\s*BuildingConnected\b/.test(text)) return "buildingconnected";
  if (from.includes("isqft") || /ConstructConnect|isqft\.com/i.test(text)) return "constructconnect";
  if (/procore\.com|View in Procore/i.test(text)) return "procore";
  if (looksLikeBatch(text)) return "client_batch";
  return "direct";
}

/** Not every email in a bid inbox is an invitation. Skip ones with no sign of a bid at all. */
export function isBidRelated(email: InboundEmail, text: string): boolean {
  if (looksLikeBatch(text)) return true;
  return /bid|itb|quote|rfp|rfq|proposal|tender|invit|addend|rfi|job walk|site walk/i.test(email.subject + " " + text.slice(0, 2000));
}

/** Read one email and return the bid or bids in it. A client's job list returns one entry per job. */
export function parseItbEmail(email: InboundEmail): ParsedItb[] {
  const text = bodyText(email);
  if (!isBidRelated(email, text)) return [];
  switch (detectPlatform(email, text)) {
    case "buildingconnected":
      return [parseBuildingConnected(email, text)];
    case "constructconnect":
      return [parseConstructConnect(email, text)];
    case "procore":
      return [parseProcore(email, text)];
    case "client_batch":
      return parseBatch(email, text);
    default:
      return [parseDirect(email, text)];
  }
}

/** Two names refer to the same project when their words match once punctuation and filler are removed. */
export function projectKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/&#39;|['’]/g, "")
    .replace(/\b(project|the|ti|remodel|renovation)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
