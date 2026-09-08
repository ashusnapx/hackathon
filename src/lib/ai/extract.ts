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
  // Case-insensitive on the letter prefix. Transcription returns lowercase, so
  // a bank reference dictated aloud — "hdfc12345678901" — went unrecognised
  // while the same string typed in capitals matched.
  ref: /\b(?:[A-Z]{2,6}\d{8,20}|\d{12,22})\b/gi,
  account: /\b\d{9,18}\b/g,
  url: /\bhttps?:\/\/[^\s<>"')]+|\b(?:www\.)[^\s<>"')]+/gi,
  handle: /(?:^|\s)@([A-Za-z][A-Za-z0-9._]{2,29})\b/g,
};

const APPS = [
  "whatsapp","telegram","instagram","facebook","paytm","phonepe","google pay","gpay","bhim",
  "amazon","flipkart","meesho","anydesk","teamviewer","quicksupport","skype","zoom","olx",
  "linkedin","snapchat","youtube","truecaller","navi","cred","zerodha","binance","wazirx",
];

/**
 * The zero of every Indic digit block this file accepts.
 *
 * Listed explicitly because the arithmetic below has to subtract the zero of
 * the block a character actually came from. The nine Brahmic zeros all sit at
 * 0x_6, not 0x_0, which is what made the obvious bit-trick wrong.
 */
const DIGIT_ZEROS = [
  0x0966, // Devanagari
  0x09e6, // Bengali
  0x0a66, // Gurmukhi
  0x0ae6, // Gujarati
  0x0b66, // Odia
  0x0be6, // Tamil
  0x0c66, // Telugu
  0x0ce6, // Kannada
  0x0d66, // Malayalam
  0x0660, // Arabic-Indic
  0x06f0, // Extended Arabic-Indic
];

/**
 * Indic digit forms, so a statement typed in Devanagari still yields numbers.
 *
 * This used to mask the low nibble — `(c - (c & ~0xf)) & 0xf` — which is only
 * correct for a block whose zero sits on a 0x_0 boundary. Arabic-Indic (U+0660)
 * and its extended form (U+06F0) do; the nine Brahmic blocks do not, they start
 * at 0x_6. So every one of them came out shifted by six: Devanagari ३ read as
 * 9, and "₹८५०००" parsed as ₹14,11,666 rather than ₹85,000 — not a failure to
 * parse, which would be visible, but a confident wrong number.
 *
 * That number does not stay on the screen. It reaches an NCRP description and
 * an FIR application, and a digit string mangled this way is still long enough
 * for RX.ref to match, so a fabricated UTR is reported as a real one. Subtract
 * each block's own zero.
 */
function normaliseDigits(s: string): string {
  return s.replace(/[०-९০-৯૦-૯୦-୯௦-௯౦-౯೦-೯൦-൯੦-੯۰-۹٠-٩]/g, (d) => {
    const c = d.codePointAt(0)!;
    const zero = DIGIT_ZEROS.find((z) => c >= z && c <= z + 9);
    // A character the regex admits but the table does not know is left alone
    // rather than guessed at: a wrong digit is worse than an unparsed one.
    return zero === undefined ? d : String(c - zero);
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
 * Number words, in the three forms people actually dictate them in.
 *
 * Romanised Hindi is here because it is what most of this app's users type and
 * what transcription returns for them — "das hazaar ka fraud hua hai" is an
 * ordinary sentence, and it used to yield no amount at all while its English
 * twin "ten thousand" worked. Devanagari is here for the same reason one step
 * further along.
 */
const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, fifteen: 15,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  hundred: 100,

  ek: 1, do: 2, teen: 3, char: 4, chaar: 4, paanch: 5, panch: 5, chhe: 6, chah: 6, che: 6,
  saat: 7, aath: 8, nau: 9, das: 10, dus: 10, gyarah: 11, barah: 12, pandrah: 15,
  bees: 20, bis: 20, tees: 30, tis: 30, chalis: 40, chaalis: 40, pachas: 50, pachaas: 50,
  saath: 60, sattar: 70, assi: 80, nabbe: 90, sau: 100,

  "एक": 1, "दो": 2, "तीन": 3, "चार": 4, "पांच": 5, "पाँच": 5, "छह": 6, "सात": 7, "आठ": 8,
  "नौ": 9, "दस": 10, "बीस": 20, "तीस": 30, "चालीस": 40, "पचास": 50, "साठ": 60, "सत्तर": 70,
  "अस्सी": 80, "नब्बे": 90, "सौ": 100,
};

/** Scale words, longest-first so "lakhs" is not read as "lakh" plus a stray s. */
const SCALES: [RegExp, number][] = [
  [/^(crores?|cr|करोड़)$/i, 10_000_000],
  [/^(lakhs?|lacs?|लाख)$/i, 100_000],
  [/^(thousand|hazaar|hazar|hajar|हज़ार|हजार)$/i, 1_000],
];

const WORD_KEYS = Object.keys(WORD_NUMBERS).sort((a, b) => b.length - a.length).join("|");

/**
 * One or more number words, then a scale word.
 *
 * The run of number words is captured whole rather than just its first token:
 * "eighty five thousand" is 85,000, and reading only "eighty" returned 80,000 —
 * a wrong figure that then went into a complaint. Only spaces and hyphens are
 * allowed between them, so the match cannot jump a clause boundary and glue an
 * unrelated number to an unrelated scale.
 */
// Unicode-aware boundaries. JavaScript's \b is defined over [A-Za-z0-9_], so a
// Devanagari number word has a "boundary" on every side of every character and
// none where it matters — "पचास हज़ार" never matched while "pachas hazaar" did.
const EDGE_L = "(?<![\\p{L}\\p{N}])";
const EDGE_R = "(?![\\p{L}\\p{N}])";

const WORD_AMOUNT = new RegExp(
  `${EDGE_L}((?:${WORD_KEYS})(?:[\\s-]+(?:${WORD_KEYS}))*)[\\s-]+(crores?|cr|lakhs?|lacs?|thousand|hazaar|hazar|hajar|लाख|करोड़|हज़ार|हजार)${EDGE_R}`,
  "iu",
);

/**
 * Compose a run of number words into one value.
 *
 * "eighty five" is 85 and "do sau" is 200 — tens and units add, and a hundred
 * multiplies whatever came before it.
 */
function composeWords(run: string): number {
  let total = 0;
  for (const word of run.toLowerCase().split(/[\s-]+/)) {
    const value = WORD_NUMBERS[word];
    if (value === undefined) continue;
    if (value === 100) total = (total || 1) * 100;
    else total += value;
  }
  return total || 1;
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

  const words = text.match(WORD_AMOUNT);
  if (words) {
    const scale = SCALES.find(([re]) => re.test(words[2]))?.[1] ?? 1_000;
    return Math.round(composeWords(words[1]) * scale);
  }

  return undefined;
}

/**
 * Rough incident time from phrases like "yesterday evening", "2 hours ago",
 * "कल रात". Only ever a starting guess — the citizen confirms it on the next
 * screen, because every deadline hangs off this value.
 */
/**
 * A quantity in front of a unit — "10", "das", "दस", or a compound like
 * "twenty five". Shares the number words the amount parser uses.
 */
const QTY = `(?:\\d+|(?:${WORD_KEYS})(?:[\\s-]+(?:${WORD_KEYS}))*)`;

/**
 * How long ago, in the units people dictate.
 *
 * Hindi units are here for the same reason the Hindi number words are: "das din
 * pehle" is how a very large share of this app's users say "ten days ago", and
 * it used to fall through to a branch that returned today.
 */
const UNITS: [RegExp, "min" | "hour" | "day" | "week" | "month"][] = [
  [/^(minutes?|mins?|mint|मिनट)$/i, "min"],
  [/^(hours?|hrs?|ghante|ghanta|ghanton|घंटे|घंटा|घंटों)$/i, "hour"],
  [/^(days?|din|dino|दिन|दिनों)$/i, "day"],
  [/^(weeks?|hafte|hafta|hafton|हफ्ते|हफ्ता|सप्ताह)$/i, "week"],
  [/^(months?|mahine|mahina|mahinon|महीने|महीना|महीनों)$/i, "month"],
];

const UNIT_WORDS = UNITS.map(([re]) => re.source.replace(/^\^\(|\)\$$/g, "")).join("|");
const AGO_WORDS = "ago|before|back|pehle|pahle|पहले";

const RELATIVE = new RegExp(
  `(?<![\\p{L}\\p{N}])(${QTY})[\\s-]+(${UNIT_WORDS})[\\s-]+(?:${AGO_WORDS})(?![\\p{L}\\p{N}])`,
  "iu",
);

export function extractIncidentTime(input: string, now = new Date()): string | undefined {
  if (!input) return undefined;
  // Normalised here too. This function reads "3 din pehle" through a digit
  // match, so a statement dictated in Devanagari digits — "३ दिन पहले" —
  // silently yielded no time at all while its romanised twin worked.
  const t = normaliseDigits(input).toLowerCase();
  const d = new Date(now.getTime());

  // Checked before the bare day words, and that order is load-bearing. "aaj se
  // das din pehle" — ten days before today — contains "aaj", and while the
  // today branch ran first the whole phrase resolved to today. A wrong date is
  // worse than no date: it goes into a police complaint as the incident date,
  // and the reporting deadlines the rest of this app computes hang off it.
  const relative = t.match(RELATIVE);
  if (relative) {
    const n = /^\d+$/.test(relative[1]) ? Number(relative[1]) : composeWords(relative[1]);
    const unit = UNITS.find(([re]) => re.test(relative[2]))?.[1] ?? "day";
    if (unit === "min") return new Date(now.getTime() - n * 60_000).toISOString();
    if (unit === "hour") return new Date(now.getTime() - n * 3_600_000).toISOString();
    // Days, weeks and months move the calendar rather than subtracting a fixed
    // span, so a month is the month it actually was and nothing drifts across
    // a daylight change.
    if (unit === "month") {
      // Clamped, not overflowed. setMonth alone turns 31 March minus one month
      // into 31 February, which JavaScript silently rolls forward to 3 March —
      // a date after the one the person was describing.
      const dayOfMonth = d.getDate();
      d.setDate(1);
      d.setMonth(d.getMonth() - n);
      const lastOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(dayOfMonth, lastOfMonth));
    } else {
      d.setDate(d.getDate() - n * (unit === "week" ? 7 : 1));
    }
    return d.toISOString();
  }

  const evening = /(evening|night|raat|रात|शाम|sham)/.test(t);
  const morning = /(morning|subah|सुबह)/.test(t);
  const afternoon = /(afternoon|dopahar|दोपहर)/.test(t);
  const hour = evening ? 20 : afternoon ? 15 : morning ? 9 : 12;

  if (/(day before yesterday|parso|परसों)/.test(t)) {
    d.setDate(d.getDate() - 2);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  }
  if (/(yesterday|kal|कल|बीती रात|last night)/.test(t)) {
    d.setDate(d.getDate() - 1);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  }
  if (/(just now|abhi|अभी)/.test(t)) return now.toISOString();
  if (/(today|aaj|आज)/.test(t)) {
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  }

  return undefined;
}
