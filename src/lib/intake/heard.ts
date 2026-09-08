import { extractAmount, extractEntities, extractIncidentTime } from "@/lib/ai/extract";
import { parseIndianAmount } from "@/lib/intake/details";
import type { DictKey } from "@/lib/i18n/dict/en";

/**
 * What we have actually heard, so far, from what the person has said.
 *
 * The composer used to show six static pills — a list of things worth
 * mentioning, unchanged from the first word to the last. This turns that same
 * list into a reading of the statement as it grows: an item goes green when the
 * text genuinely contains it, and the rest stay marked as still to say.
 *
 * Three rules hold this honest, and they are the whole design:
 *
 *  1. Only committed text is ever read. Interim speech-recognition output is
 *     still being revised — words appear and are taken back — and a tick that
 *     un-ticks itself while somebody is mid-sentence tells them they are being
 *     misheard. `VoiceComposer` commits each finished take into `value`; that
 *     is the only input here. On a phone this means the list moves once per
 *     take rather than word by word, which is the honest granularity: every
 *     touch device skips SpeechRecognition entirely (see `prefersRecorder` in
 *     VoiceInput), so word-by-word ticking was never available to most users.
 *
 *  2. Nothing is listed that cannot be detected. The old pill set led with the
 *     person's name and their bank's name, and there is no extractor for either
 *     one anywhere in this codebase — they arrive only from the model or from
 *     Vaani, later. Ticking a set containing two items that can never go green
 *     would turn a reassurance into a form somebody is failing. Those two moved
 *     to a separate line that promises the interview will ask.
 *
 *  3. What was found is shown, not just that something was found. A bare tick
 *     beside "How much money" hides whether we read ₹85,000 or ₹8,500. The
 *     value is printed so a wrong reading is visible and can be corrected —
 *     which matters most exactly where the parsers are weakest.
 *
 * Nothing is remembered between readings. That looks like it invites flicker —
 * an item ticking and un-ticking as recognition revises itself — but this only
 * ever reads text the composer has already committed, and committed text
 * changes downward for one reason: the person edited it. An item that stopped
 * being true should stop being ticked.
 */

export type HeardId = "story" | "when" | "amount" | "contact" | "reference" | "where";

export interface HeardItem {
  id: HeardId;
  /** Label shown whether or not it has been heard. */
  label: DictKey;
  found: boolean;
  /** What we read, when there is something worth showing back. */
  value?: string;
}

/**
 * The length at which a statement counts as told.
 *
 * Same threshold as the weight-15 check in `completeness()`, so this item and
 * the case file's own progress agree. It is pure string length, which makes it
 * the one item that fires in all 23 languages and on every device — including
 * for somebody speaking Santali on a 2G Android, where no other extractor here
 * matches anything at all.
 */
const STORY_CHARS = 60;

const ITEMS: { id: HeardId; label: DictKey }[] = [
  { id: "story", label: "heard.story" },
  { id: "when", label: "heard.when" },
  { id: "amount", label: "heard.amount" },
  { id: "contact", label: "heard.contact" },
  { id: "reference", label: "heard.reference" },
  { id: "where", label: "heard.where" },
];

/** Indian grouping, and no decimals — this is a rupee figure, not a price. */
export function rupees(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

/**
 * A spoken quantity and the scale word that ends it — "eighty five thousand",
 * "do lakh", "1.4 crore". Four words of run-up is enough for every compound
 * this parser handles and short enough that it cannot reach back into an
 * unrelated sentence.
 */
const SPOKEN_AMOUNT =
  /((?:[\w.,]+[\s-]+){0,4}(?:thousand|lakhs?|lacs?|crores?|hazaar|hazar|hajar|हज़ार|हजार|लाख|करोड़))/i;

/**
 * Read a money figure the way the interview would read it.
 *
 * Two parsers disagree on spoken quantities: "eighty five thousand" is 85,000
 * to `parseIndianAmount` and 80,000 to `extractAmount`, which takes the first
 * unit word and one scale and drops the rest. The interview uses the better
 * one, so this does too — otherwise the figure shown here would change when the
 * person reached the questions, with no explanation.
 *
 * But `parseIndianAmount` is a parser, not a detector. Handed a whole
 * statement it will read a number out of almost any digits in it: the real
 * sentence "he called from 9876543210 ... the UTR is hdfc12345678901" came
 * back as ₹9,87,66,28,210. So it is never shown the statement. `extractAmount`
 * decides whether there is money here at all, and the better parser is then
 * given only the handful of words around the scale word — never the phone
 * numbers, never the reference.
 */
function amountOf(text: string): number | undefined {
  const detected = extractAmount(text);
  if (detected === undefined || detected <= 0) return undefined;

  const spoken = text.match(SPOKEN_AMOUNT);
  if (!spoken) return detected;

  const parsed = parseIndianAmount(spoken[1]);
  // Only trust the second opinion when it agrees to within an order of
  // magnitude. Beyond that the fragment caught something that was not the
  // amount, and the detector's answer is the safer one to show.
  if (parsed > 0 && parsed >= detected && parsed < detected * 10) return parsed;
  return detected;
}

/**
 * Did the person actually say a time of day, or only a day?
 *
 * `extractIncidentTime` always returns a full instant. For "yesterday" or
 * "3 days ago" the clock half of that instant is simply carried over from the
 * current time — so rendering it would put a precise, invented time next to a
 * green tick. These are the phrases that genuinely carry one: an hour- or
 * minute-scale offset, or a named part of the day.
 */
const SAID_A_TIME = new RegExp(
  [
    // An hour- or minute-scale offset, in either script and with or without
    // digits: "2 hours ago", "do ghante pehle", "दस मिनट पहले".
    "[\\p{L}\\p{N}]+[\\s-]+(?:minutes?|mins?|mint|मिनट|hours?|hrs?|ghante|ghanta|घंटे|घंटा)[\\s-]+(?:ago|before|back|pehle|pahle|पहले)",
    "just now|abhi|अभी",
    "evening|night|raat|रात|शाम|sham|morning|subah|सुबह|afternoon|dopahar|दोपहर",
  ].join("|"),
  "iu",
);

/** How the resolved instant is shown back, so a wrong guess is visible. */
function whenLabel(iso: string, locale: string, precise: boolean): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  // Some of the 23 codes are extended tags Intl may reject outright. A date
  // rendered in the wrong locale is a cosmetic problem; a RangeError thrown
  // here would take down the panel while somebody is mid-sentence.
  const tag = (() => {
    try {
      new Intl.DateTimeFormat(locale);
      return locale;
    } catch {
      return "en-IN";
    }
  })();
  const date = at.toLocaleDateString(tag, { day: "numeric", month: "short" });
  if (!precise) return date;
  return `${date}, ${at.toLocaleTimeString(tag, { hour: "numeric", minute: "2-digit" })}`;
}

/**
 * Echo a named app the way the person said it.
 *
 * The APPS list is lowercase, and printing "whatsapp" back at somebody who
 * wrote "WhatsApp" reads as a machine that heard something slightly different
 * from what they said. One index into the original text returns their casing.
 */
function asSaid(text: string, needle: string): string {
  const at = text.toLowerCase().indexOf(needle.toLowerCase());
  return at === -1 ? needle : text.slice(at, at + needle.length);
}

export function readHeard(text: string, locale = "en-IN", now = new Date()): HeardItem[] {
  const trimmed = text.trim();
  const entities = extractEntities(trimmed);
  const amount = amountOf(trimmed);
  const when = extractIncidentTime(trimmed, now);

  const contact = entities.phones[0] ?? entities.upiIds[0] ?? entities.emails[0] ?? entities.handles[0];
  const reference = entities.refs[0] ?? entities.accounts[0];
  const place = entities.apps[0] ?? entities.urls[0];

  const found: Record<HeardId, { found: boolean; value?: string }> = {
    story: { found: trimmed.length >= STORY_CHARS },
    when: { found: Boolean(when), value: when ? whenLabel(when, locale, SAID_A_TIME.test(trimmed)) : undefined },
    amount: { found: amount !== undefined, value: amount !== undefined ? rupees(amount) : undefined },
    contact: { found: Boolean(contact), value: contact },
    reference: { found: Boolean(reference), value: reference },
    where: { found: Boolean(place), value: place ? asSaid(trimmed, place) : undefined },
  };

  return ITEMS.map((item) => ({ ...item, ...found[item.id] }));
}

/** True once there is anything to show — used to keep the panel honest at rest. */
export function anyHeard(items: HeardItem[]): boolean {
  return items.some((item) => item.found);
}
