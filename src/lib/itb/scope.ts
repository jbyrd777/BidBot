import { DEFAULT_TRADE, tradeProfile } from "@/lib/trades";

/** Scope and location detection shared by every parser. Scope is read through the company's trade profile. */

let active = DEFAULT_TRADE;

/** Parse with a given trade's profile. Each company ingests its own mail, so the trade is set per run. */
export function withTrade<T>(trade: string, fn: () => T): T {
  const prev = active;
  active = trade;
  try {
    return fn();
  } finally {
    active = prev;
  }
}

export function activeTrade() {
  return tradeProfile(active);
}

export function tradeScope(text: string): string[] {
  const p = tradeProfile(active);
  const found = p.rules.filter(([, re]) => re.test(text)).map(([name]) => name);
  if (p.drop && found.some((f) => p.drop!.whenAny.includes(f))) return found.filter((f) => f !== p.drop!.parent);
  return found;
}

export function mentionsTrade(text: string): boolean {
  return tradeProfile(active).mention.test(text) || tradeScope(text).length > 0;
}

const STATES: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA", colorado: "CO",
  connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID",
  illinois: "IL", indiana: "IN", iowa: "IA", kansas: "KS", kentucky: "KY", louisiana: "LA",
  maine: "ME", maryland: "MD", massachusetts: "MA", michigan: "MI", minnesota: "MN",
  mississippi: "MS", missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK", oregon: "OR",
  pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC", "south dakota": "SD",
  tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT", virginia: "VA", washington: "WA",
  "west virginia": "WV", wisconsin: "WI", wyoming: "WY",
};
const CODES = new Set(Object.values(STATES));

/** State code from text such as "Burlington, WA 98233", "Sunrise, FL" or "Immokalee, Florida". */
export function stateFrom(text?: string): string | undefined {
  if (!text) return undefined;
  const code = /,\s*([A-Z]{2})(?:\s+\d{5}|\b)/.exec(text)?.[1];
  if (code && CODES.has(code)) return code;
  const lower = text.toLowerCase();
  for (const [name, abbr] of Object.entries(STATES)) {
    if (new RegExp(`,\\s*${name}\\b`).test(lower)) return abbr;
  }
  return undefined;
}

/** A city and state written inside prose, for example "in Ft Myers, FL" or "in Immokalee, Florida". */
export function placeInProse(text: string): string | undefined {
  const re = /\bin\s+((?:[A-Z][A-Za-z.]+\s){0,3}[A-Z][A-Za-z.]+),\s*([A-Z]{2}\b|[A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const place = `${m[1]}, ${m[2]}`;
    if (stateFrom(place)) return place;
  }
  return undefined;
}

/** A single state named in a note, for example "Some Florida jobs for next week". */
export function stateMentioned(text: string): string | undefined {
  const lower = text.toLowerCase();
  const found = Object.entries(STATES).filter(([name]) => new RegExp(`\\b${name}\\b`).test(lower));
  return found.length === 1 ? found[0][1] : undefined;
}

export function trimCountry(location?: string): string | undefined {
  return location?.replace(/,?\s*(United States of America|United States|USA)\s*$/i, "").trim();
}
