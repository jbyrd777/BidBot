import type { DueDate } from "./types";

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

const MONTH_RE =
  "(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";
const WEEKDAY_RE = "(?:(?:Mon|Tue|Tues|Wed|Thu|Thur|Thurs|Fri|Sat|Sun)[a-z]*\\.?,?\\s+)?";
const TIME_RE = "(?:,?\\s*(?:at|by|@)?\\s*(\\d{1,2})(?::(\\d{2}))?\\s*(AM|PM|am|pm|a\\.m\\.|p\\.m\\.)\\s*(E[SD]?T|C[SD]?T|M[SD]?T|P[SD]?T)?)?";

const NAMED_DATE = new RegExp(
  `${WEEKDAY_RE}${MONTH_RE}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?${TIME_RE}`,
  "i",
);
const NUMERIC_DATE = new RegExp(
  `\\b(\\d{1,2})/(\\d{1,2})(?:/(\\d{2,4}))?\\b${TIME_RE}`,
  "i",
);

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Pick the year that puts a month and day closest to the reference, never more than 45 days back. */
function inferYear(month: number, day: number, reference: Date): number {
  const refYear = reference.getUTCFullYear();
  const candidate = Date.UTC(refYear, month - 1, day);
  const floor = reference.getTime() - 45 * 86_400_000;
  return candidate < floor ? refYear + 1 : refYear;
}

function toTime(h?: string, m?: string, ampm?: string): string | undefined {
  if (!h || !ampm) return undefined;
  let hour = Number(h) % 12;
  if (/p/i.test(ampm)) hour += 12;
  return `${pad(hour)}:${pad(Number(m ?? 0))}`;
}

function build(
  month: number,
  day: number,
  year: number | undefined,
  reference: Date,
  raw: string,
  h?: string,
  m?: string,
  ampm?: string,
  tz?: string,
): DueDate | undefined {
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  const y = year ?? inferYear(month, day, reference);
  return {
    date: `${y}-${pad(month)}-${pad(day)}`,
    time: toTime(h, m, ampm),
    tz: tz?.toUpperCase(),
    raw: raw.trim(),
  };
}

/** Find the first date in a string, written as "Nov 12, 2026", "Friday, November 6th at 3PM" or "11/4". */
export function findDate(text: string, reference: Date): DueDate | undefined {
  const named = NAMED_DATE.exec(text);
  const numeric = NUMERIC_DATE.exec(text);
  const useNamed = named && (!numeric || named.index <= numeric.index);

  if (useNamed && named) {
    const [raw, mon, day, year, h, m, ampm, tz] = named;
    const month = MONTHS[mon.slice(0, 4).toLowerCase()] ?? MONTHS[mon.slice(0, 3).toLowerCase()];
    return build(month, Number(day), year ? Number(year) : undefined, reference, raw, h, m, ampm, tz);
  }
  if (numeric) {
    const [raw, mon, day, yearRaw, h, m, ampm, tz] = numeric;
    let year = yearRaw ? Number(yearRaw) : undefined;
    if (year !== undefined && year < 100) year += 2000;
    return build(Number(mon), Number(day), year, reference, raw, h, m, ampm, tz);
  }
  return undefined;
}

/** Find a date that follows one of the given labels, for example "Bid Due:" or "due". */
export function findDateAfter(
  text: string,
  labels: RegExp,
  reference: Date,
  window = 80,
): DueDate | undefined {
  const re = new RegExp(labels.source, labels.flags.includes("g") ? labels.flags : labels.flags + "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const slice = text.slice(match.index + match[0].length, match.index + match[0].length + window);
    const found = findDate(slice, reference);
    if (found) return found;
  }
  return undefined;
}

export function daysBetween(fromIso: string, toDate: string): number {
  const from = new Date(fromIso.slice(0, 10) + "T00:00:00Z").getTime();
  const to = new Date(toDate + "T00:00:00Z").getTime();
  return Math.round((to - from) / 86_400_000);
}
