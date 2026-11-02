import { convert } from "html-to-text";
import type { Contact, ItbLink } from "./types";

const ENTITIES: Record<string, string> = {
  "&amp;": "&", "&#39;": "'", "&apos;": "'", "&quot;": '"', "&nbsp;": " ", "&lt;": "<", "&gt;": ">",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(amp|#39|apos|quot|nbsp|lt|gt);/g, (m) => ENTITIES[m] ?? m);
}

export function htmlToText(html: string): string {
  return convert(html, {
    wordwrap: false,
    selectors: [
      { selector: "img", format: "skip" },
      { selector: "a", options: { hideLinkHrefIfSameAsText: true } },
    ],
  });
}

/** Body as plain text, with entities decoded and stray inline HTML stripped. */
export function bodyText(email: { text?: string; html?: string }): string {
  const raw = email.text && email.text.trim() ? email.text : htmlToText(email.html ?? "");
  return decodeEntities(raw.replace(/<\/?(div|b|br|ul|li|p|u|i|strong|em)[^>]*>/gi, " "));
}

/** Collapse all whitespace so phrases split across lines still match. */
export function flatten(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

const URL_RE = /https?:\/\/[^\s)\]>"']+/g;

export function extractLinks(text: string): ItbLink[] {
  const seen = new Set<string>();
  const links: ItbLink[] = [];
  for (const url of text.match(URL_RE) ?? []) {
    const clean = url.replace(/[.,;]+$/, "");
    if (seen.has(clean)) continue;
    seen.add(clean);
    const label = linkLabel(clean);
    if (label) links.push({ label, url: clean });
  }
  return links;
}

function linkLabel(url: string): string | undefined {
  if (/buildingconnected\.com\/(goto|rfps)/.test(url) && !/state=/.test(url)) return "BuildingConnected";
  if (/isqft\.com\/services\/(Access|go\/RedirectToDocuments)/.test(url)) return "ConstructConnect";
  if (/procore\.com\/.*(route_to_bid_sheet|download_zip)/.test(url)) {
    return url.includes("download_zip") ? "Procore documents" : "Procore";
  }
  if (/box\.com\/s\//.test(url)) return "Box";
  if (/dropbox\.com/.test(url)) return "Dropbox";
  if (/sharepoint\.com|onedrive/.test(url)) return "SharePoint";
  if (/drive\.google\.com/.test(url)) return "Google Drive";
  return undefined;
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_RE = /(?:\+1[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}(?:\s*(?:ext\.?|x)\s*\d+)?/i;

const PLATFORM_DOMAINS = /buildingconnected|isqft|constructconnect|procore|zendesk/i;

export function firstEmail(text: string, exclude: string[] = []): string | undefined {
  return (text.match(EMAIL_RE) ?? []).find(
    (e) => !PLATFORM_DOMAINS.test(e) && !exclude.some((x) => e.toLowerCase().includes(x.toLowerCase())),
  );
}

export function firstPhone(text: string): string | undefined {
  return PHONE_RE.exec(text)?.[0].trim();
}

export function contactFrom(section: string, name?: string, title?: string): Contact | undefined {
  const c: Contact = {
    name: name?.trim() || undefined,
    title: title?.trim() || undefined,
    email: firstEmail(section),
    phone: firstPhone(section),
  };
  return c.name || c.email || c.phone ? c : undefined;
}

export function projectSf(text: string): number | undefined {
  const m = /([\d,]{3,9})\s*(?:SF|sq\.?\s?ft\.?|square\s+feet)\b/i.exec(text);
  if (!m) return undefined;
  const n = Number(m[1].replace(/,/g, ""));
  return Number.isFinite(n) && n >= 100 ? n : undefined;
}

/** Turn "mavacon.com" into "Mavacon", using the casing found in the text when there is one, for example "AsaCarlton.com" to "Asa Carlton". */
export function companyFromDomain(address: string, text: string): string | undefined {
  const domain = address.split("@")[1]?.toLowerCase();
  if (!domain) return undefined;
  const root = domain.split(".").slice(-2, -1)[0];
  if (!root || /gmail|outlook|yahoo|hotmail|icloud/.test(root)) return undefined;
  // A signature line such as "Consolidated Flooring | 40 W Fullerton Avenue" names the company outright.
  for (const line of text.split("\n")) {
    const name = /^\s*([A-Z][\w&.']*(?: [A-Z&][\w&.']*){0,4})\s+\|/.exec(line)?.[1];
    if (name && name.toLowerCase().replace(/[^a-z]/g, "").startsWith(root.slice(0, 4))) return name;
  }
  const cased = new RegExp(`\\b(${root})\\.com\\b`, "i").exec(text)?.[1];
  const base = cased && cased !== cased.toLowerCase() && cased !== cased.toUpperCase() ? cased : root;
  const spaced = base.replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function cleanSubject(subject: string): string {
  let s = decodeEntities(subject);
  for (let i = 0; i < 3; i++) s = s.replace(/^\s*(re|fw|fwd)\s*:\s*/i, "");
  return s
    .replace(/^\s*(bid n?vite|bid invite|bid invitation|invitation to bid|itb)\s*[:\-–]\s*/i, "")
    .replace(/\s*[-–]\s*(flooring quote|itb|bid invite|invitation to bid)\s*$/i, "")
    .replace(/\s+project$/i, "")
    .trim();
}
