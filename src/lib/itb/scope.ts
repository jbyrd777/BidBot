/** Flooring scope and location detection shared by every parser. */

const SCOPE_RULES: [string, RegExp][] = [
  ["Carpet tile", /carpet\s*tile|\bCPT[- ]?\d|modular carpet/i],
  ["Carpet", /broadloom|carpet\b(?!\s*tile)/i],
  ["LVT", /\bLVT\b|luxury vinyl|vinyl tile flooring|096519\.23/i],
  ["VCT", /\bVCT\b|vinyl composition|096519\.19/i],
  ["Sheet vinyl", /sheet vinyl|homogeneous|heterogeneous|096516/i],
  ["Rubber", /rubber (flooring|tile|sheet)|096516\.13/i],
  ["Resilient", /resilient|096500/i],
  ["Tile", /\btile\b(?!\s*ceiling)|porcelain|ceramic|093000/i],
  ["Wood", /wood flooring|hardwood|096400/i],
  ["Resinous", /epoxy|resinous|urethane cement|096700/i],
  ["Polished concrete", /polished concrete|concrete polish/i],
  ["Base", /vinyl base|rubber base|resilient base|096513/i],
  ["Floor prep", /floor (demo|prep|leveling)|self[- ]level|moisture mitigation|moisture test/i],
];

export function flooringScope(text: string): string[] {
  const found = SCOPE_RULES.filter(([, re]) => re.test(text)).map(([name]) => name);
  // "Resilient" is the parent of VCT, LVT, sheet and rubber; drop it when a child is named.
  if (found.some((f) => ["LVT", "VCT", "Sheet vinyl", "Rubber"].includes(f))) {
    return found.filter((f) => f !== "Resilient");
  }
  return found;
}

export function mentionsFlooring(text: string): boolean {
  return /flooring|floor covering|finishes|all trades|096\d{3}|09 6\d/i.test(text) || flooringScope(text).length > 0;
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
