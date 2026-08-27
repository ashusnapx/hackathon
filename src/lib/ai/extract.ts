import { EMPTY_ENTITIES, type Entities } from "@/lib/case/types";

/**
 * Deterministic extraction, run before and independently of the model.
 *
 * A UTR number is a twelve-digit string — a regex gets that right every time,
 * and a language model occasionally does not. The model's job is the things
 * regex cannot do: understanding "he took eighty-five thousand from me" or
 * deciding whether a number is the fraudster's or the victim's. So we run both
 * and merge, rather than trusting either alone.
 */

export const UPI_HANDLES = [
  "okhdfcbank","okaxis","okicici","oksbi","ybl","ibl","axl","paytm","apl","upi","sbi","hdfcbank",
  "icici","axisbank","kotak","yesbank","idfcbank","fbl","jupiteraxis","airtel","freecharge",
  "abfspay","timecosmos","waaxis","waicici","wahdfcbank","wasbi","postbank","indus","pnb","boi",
  "cnrb","barodampay","rmhdfcbank","dbs","federal","jio","slice","naviaxis","superyes",
];

const RX = {
  email: /\b[\w.+-]+@[\w-]+\.[\w.-]{2,}\b/g,
  upi: new RegExp(String.raw`\b[\w.\-]{2,40}@(?:${UPI_HANDLES.join("|")})\b`, "gi"),
  phone: /(?:\+?91[\s-]?)?\b[6-9]\d{9}\b/g,
  // UTR / RRN / bank reference: 12 digits, or a lettered prefix followed by digits.
  ref: /\b(?:[A-Z]{2,6}\d{8,20}|\d{12,22})\b/g,
  account: /\b\d{9,18}\b/g,
  url: /\bhttps?:\/\/[^\s<>"')]+|\b(?:www\.)[^\s<>"')]+/gi,
  handle: /(?:^|\s)@([A-Za-z][A-Za-z0-9._]{2,29})\b/g,
};

const APPS = [
  "whatsapp","telegram","instagram","facebook","paytm","phonepe","google pay","gpay","bhim",
  "amazon","flipkart","meesho","anydesk","teamviewer","quicksupport","skype","zoom","olx",
  "linkedin","snapchat","youtube","truecaller","navi","cred","zerodha","binance","wazirx",
];

/** Indic digit forms, so a statement typed in Devanagari still yields numbers. */
function normaliseDigits(s: string): string {
  return s.replace(/[०-९০-৯૦-૯୦-୯௦-௯౦-౯೦-೯൦-൯੦-੯۰-۹٠-٩]/g, (d) => {
    const c = d.codePointAt(0)!;
    return String((c - (c & ~0xf)) & 0xf);
  });
}

const uniq = (xs: string[]) => Array.from(new Set(xs.map((x) => x.trim()).filter(Boolean)));

export function extractEntities(input: string): Entities {
  if (!input?.trim()) return { ...EMPTY_ENTITIES };
  const text = normaliseDigits(input);

  const emails = uniq(text.match(RX.email) || []);
  const upiIds = uniq(text.match(RX.upi) || []);
  // A string can match both patterns; UPI wins, since it is the more specific one.
  const upiSet = new Set(upiIds.map((u) => u.toLowerCase()));
  const realEmails = emails.filter((e) => !upiSet.has(e.toLowerCase()));

  const phones = uniq((text.match(RX.phone) || []).map((p) => p.replace(/[\s-]/g, "").replace(/^\+?91/, "")));
  const phoneSet = new Set(phones);

  const refs = uniq((text.match(RX.ref) || []).filter((r) => !phoneSet.has(r)));
  const refSet = new Set(refs);

  const accounts = uniq(
    (text.match(RX.account) || []).filter((a) => !phoneSet.has(a) && !refSet.has(a) && a.length >= 9 && a.length <= 18),
  );

  const urls = uniq(text.match(RX.url) || []);

  const handles: string[] = [];
  for (const m of text.matchAll(RX.handle)) {
    const h = m[1];
    if (!UPI_HANDLES.includes(h.toLowerCase())) handles.push("@" + h);
  }

  const lower = text.toLowerCase();
  const apps = APPS.filter((a) => lower.includes(a));

  return {
    upiIds, phones, accounts, refs, urls,
    emails: realEmails,
    handles: uniq(handles),
    apps: uniq(apps),
  };
}

/**
 * Money, the way Indians actually write it: "85,000", "Rs 85000", "₹1.4L",
 * "eighty five thousand", "2 lakh", "दो लाख".
 */
export function extractAmount(input: string): number | undefined {
  if (!input) return undefined;
  const text = normaliseDigits(input).toLowerCase();

  const scaled = text.match(
    /(?:₹|rs\.?|inr)?\s*(\d+(?:[.,]\d+)?)\s*(lakh|lakhs|lac|lacs|lakhs?|crore|crores|cr|k|thousand|hazaar|hazar|hajar|लाख|हज़ार|हजार|करोड़)/i,
  );
  if (scaled) {
    const n = parseFloat(scaled[1].replace(/,/g, ""));
    const unit = scaled[2].toLowerCase();
    if (/lakh|lac|लाख/.test(unit)) return Math.round(n * 100_000);
    if (/crore|cr|करोड़/.test(unit)) return Math.round(n * 10_000_000);
    return Math.round(n * 1_000);
  }

  // Prefer a number that is explicitly marked as money.
  const marked = text.match(/(?:₹|rs\.?\s*|inr\s*)([\d,]{3,})/i);
  if (marked) {
    const n = Number(marked[1].replace(/,/g, ""));
    if (n >= 100) return n;
  }

  // Otherwise the largest comma-grouped number that is not a phone or reference.
  const candidates = (text.match(/\b\d{1,3}(?:,\d{2,3})+\b/g) || []).map((s) => Number(s.replace(/,/g, "")));
  if (candidates.length) return Math.max(...candidates);

  const words = text.match(
    /\b(one|two|three|four|five|six|seven|eight|nine|ten|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)\b[\s\w-]{0,30}?\b(thousand|lakh|crore)\b/,
  );
  if (words) {
    const map: Record<string, number> = {
      one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
      twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100,
    };
    const base = map[words[1]] ?? 1;
    const scale = words[2] === "crore" ? 10_000_000 : words[2] === "lakh" ? 100_000 : 1_000;
    return base * scale;
  }

  return undefined;
}

/**
 * Rough incident time from phrases like "yesterday evening", "2 hours ago",
 * "कल रात". Only ever a starting guess — the citizen confirms it on the next
 * screen, because every deadline hangs off this value.
 */
export function extractIncidentTime(input: string, now = new Date()): string | undefined {
  if (!input) return undefined;
  const t = input.toLowerCase();
  const d = new Date(now.getTime());

  const ago = t.match(/(\d+)\s*(minute|min|hour|hr|day|week)s?\s*(ago|before|pehle|पहले)/);
  if (ago) {
    const n = Number(ago[1]);
    const unit = ago[2];
    const ms = /min/.test(unit) ? 60_000 : /h/.test(unit) ? 3_600_000 : /day/.test(unit) ? 86_400_000 : 604_800_000;
    return new Date(now.getTime() - n * ms).toISOString();
  }

  const evening = /(evening|night|raat|रात|शाम|sham)/.test(t);
  const morning = /(morning|subah|सुबह)/.test(t);
  const afternoon = /(afternoon|dopahar|दोपहर)/.test(t);
  const hour = evening ? 20 : afternoon ? 15 : morning ? 9 : 12;

  if (/(yesterday|kal|कल|बीती रात|last night)/.test(t)) {
    d.setDate(d.getDate() - 1);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  }
  if (/(day before yesterday|parso|परसों)/.test(t)) {
    d.setDate(d.getDate() - 2);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  }
  if (/(today|aaj|आज|just now|abhi|अभी)/.test(t)) {
    if (/(just now|abhi|अभी)/.test(t)) return now.toISOString();
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  }

  const days = t.match(/(\d+)\s*(days?|din|दिन)\s*(ago|pehle|पहले|back)/);
  if (days) {
    d.setDate(d.getDate() - Number(days[1]));
    return d.toISOString();
  }

  return undefined;
}
