import type { DictKey } from "@/lib/i18n/dict/en";
import type { CaseFile } from "./types";

/**
 * The gaps a draft leaves, and how to close them.
 *
 * A letter with `[your full name]` still in it is not a document, it is
 * homework — and it is the reason a bank counter hands it back. The drafts
 * leave those gaps honestly, because Kavach will not invent a branch address,
 * so this is the list of what they mean and where each answer lives.
 *
 * Brackets are matched by meaning rather than by exact string. The rules engine
 * writes `[Name of your bank]` and the model writes `[Bank Name]` for the same
 * hole, and a panel that only knew the first would silently offer nothing on
 * every AI-written letter — which is precisely the case that matters.
 *
 * Filling happens when a document is read, printed or downloaded, never by
 * rewriting the stored draft. Two things follow, and both matter: a name typed
 * once closes the same gap in the bank letter, the FIR application and the NCRP
 * text at the same moment, and regenerating the drafts later cannot lose what
 * the person already told us.
 */

export type PlaceholderKind = "text" | "tel" | "textarea" | "date" | "datetime";

export interface PlaceholderField {
  id: string;
  /** Tested against the bracket's contents, lowercased and space-collapsed. */
  match: RegExp;
  /** For a gap we know about, and can therefore name in every language. */
  label?: DictKey;
  /** For a gap only this letter knows about: its own words, from its own text. */
  labelText?: string;
  hint?: DictKey;
  kind: PlaceholderKind;
  read(caseFile: CaseFile): string;
  write(value: string, caseFile: CaseFile): Partial<CaseFile>;
  /** Turn the stored value into the words that belong in a letter. */
  format?(value: string): string;
}

const dateWords = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
};

const dateTimeWords = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
};

/**
 * Ordered from specific to general, and matched first-wins.
 *
 * "Bank name" has to be tried before "name" and "branch address" before
 * "address", or a person's own name ends up addressed to their branch manager.
 */
export const PLACEHOLDER_FIELDS: PlaceholderField[] = [
  {
    id: "branchAddress",
    match: /branch.*address|address.*branch|^(bank )?branch$/,
    label: "fill.branch",
    hint: "fill.branch.h",
    kind: "textarea",
    read: (c) => c.bank.branchAddress ?? "",
    write: (value, c) => ({ bank: { ...c.bank, branchAddress: value } }),
  },
  {
    id: "bankName",
    match: /^(the )?(name of (the |your )?bank|bank'?s? name|bank|bank name here)$/,
    label: "fill.bank",
    kind: "text",
    read: (c) => c.bank.name ?? "",
    write: (value, c) => ({ bank: { ...c.bank, name: value } }),
  },
  {
    id: "accountLast4",
    match: /^(bank |savings )?account( number| no\.?)?( ?\(?last (4|four) digits\)?)?$/,
    label: "fill.account",
    hint: "fill.account.h",
    kind: "text",
    read: (c) => c.bank.last4 ?? "",
    write: (value, c) => ({ bank: { ...c.bank, last4: value.replace(/\D/g, "").slice(-4) } }),
    format: (value) => `ending ${value}`,
  },
  {
    id: "ncrpAck",
    match: /ncrp|cybercrime\.gov\.in|(official|portal) (acknowledgement|complaint)( number| reference)?/,
    label: "fill.ncrpAck",
    hint: "fill.ncrpAck.h",
    kind: "text",
    read: (c) => c.tracks.find((track) => track.id === "ncrp")?.ref ?? "",
    write: (value, c) => {
      const existing = c.tracks.find((track) => track.id === "ncrp");
      return {
        tracks: existing
          ? c.tracks.map((track) => (track.id === "ncrp" ? { ...track, ref: value } : track))
          : [...c.tracks, { id: "ncrp" as const, ref: value }],
      };
    },
  },
  {
    id: "bankAck",
    match: /^(dispute|complaint|bank|acknowledgement).{0,24}(reference|number|no\.?)( if any)?$/,
    label: "fill.bankAck",
    hint: "fill.bankAck.h",
    kind: "text",
    read: (c) => c.bank.ackRef ?? "",
    write: (value, c) => ({ bank: { ...c.bank, ackRef: value } }),
  },
  {
    id: "policeStation",
    match: /police station/,
    label: "fill.police",
    hint: "fill.police.h",
    kind: "text",
    read: (c) => c.victim.policeStation ?? "",
    write: (value, c) => ({ victim: { ...c.victim, policeStation: value } }),
  },
  {
    id: "suspectPhone",
    match: /number that contacted|suspect'?s? (number|phone|mobile)|fraudster'?s? (number|phone)/,
    label: "fill.suspectPhone",
    kind: "tel",
    read: (c) => c.suspect.phones[0] ?? "",
    write: (value, c) => ({
      suspect: {
        ...c.suspect,
        phones: value ? [value, ...c.suspect.phones.slice(1)] : c.suspect.phones.slice(1),
      },
    }),
  },
  {
    id: "incidentAt",
    match: /^date and time$|date and time of (the )?(transaction|incident|fraud)/,
    label: "fill.incident",
    kind: "datetime",
    read: (c) => {
      const iso = c.incidentAt || c.triage?.incidentAt;
      if (!iso) return "";
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) return "";
      // The value an <input type="datetime-local"> expects, in local time.
      const offset = date.getTimezoneOffset() * 60_000;
      return new Date(date.getTime() - offset).toISOString().slice(0, 16);
    },
    write: (value) => ({ incidentAt: value ? new Date(value).toISOString() : undefined }),
    format: dateTimeWords,
  },
  {
    id: "bankNotifiedAt",
    match: /^date$|date.{0,20}(reported|notified|informed|told).{0,12}bank/,
    label: "fill.bankDate",
    kind: "date",
    read: (c) => (c.bank.notifiedAt ? c.bank.notifiedAt.slice(0, 10) : ""),
    write: (value, c) => ({
      bank: { ...c.bank, notifiedAt: value ? new Date(`${value}T00:00:00`).toISOString() : undefined },
    }),
    format: dateWords,
  },
  {
    id: "phone",
    match: /^(your )?(registered )?(mobile|phone|contact)( number| no\.?)?$/,
    label: "fill.phone",
    hint: "fill.phone.h",
    kind: "tel",
    read: (c) => c.victim.phone ?? "",
    write: (value, c) => ({ victim: { ...c.victim, phone: value } }),
  },
  {
    id: "email",
    match: /^(your )?(registered )?e-?mail( address| id)?$/,
    label: "fill.email",
    kind: "text",
    read: (c) => c.victim.email ?? "",
    write: (value, c) => ({ victim: { ...c.victim, email: value } }),
  },
  {
    id: "state",
    match: /^(your )?state$/,
    label: "fill.state",
    kind: "text",
    read: (c) => c.victim.state ?? "",
    write: (value, c) => ({ victim: { ...c.victim, state: value } }),
  },
  {
    id: "address",
    match: /^(your |applicant'?s? )?(full |postal |residential |complete )?address$/,
    label: "fill.address",
    kind: "textarea",
    read: (c) => c.victim.address ?? "",
    write: (value, c) => ({ victim: { ...c.victim, address: value } }),
  },
  {
    id: "name",
    match: /^(your |applicant'?s? |complainant'?s? )?(full |legal )?name$/,
    label: "fill.name",
    hint: "fill.name.h",
    kind: "text",
    read: (c) => c.victim.name ?? "",
    write: (value, c) => ({ victim: { ...c.victim, name: value } }),
  },
  {
    id: "story",
    match: /describe what happened/,
    label: "fill.story",
    hint: "fill.story.h",
    kind: "textarea",
    read: (c) => c.rawStatement ?? "",
    write: (value) => ({ rawStatement: value }),
  },
];

/** Brackets somebody at a counter fills in, not the person carrying the letter. */
const FOR_OTHERS = /for (bank|police|office|official|station) use|to be filled|received (on|by)|branch seal|office use only|signature and seal/;

/** A bracket that is a sentence addressed to the reader, not a hole in a form. */
const READER_NOTE = /^(please |before |note[:,] |add |do not |don't |if |only |choose |select |delete |remove |attach |state |confirm |check )/;

export type GapKind = "field" | "note" | "for-others";

export interface Gap {
  /** The bracket exactly as the draft wrote it. */
  text: string;
  kind: GapKind;
  field?: PlaceholderField;
}

const inner = (bracket: string): string =>
  bracket.slice(1, -1).trim().toLowerCase().replace(/\s+/g, " ");

/** Every bracketed run in a draft, as written, without repeats. */
export function bracketsIn(text: string): string[] {
  return [...new Set(text.match(/\[[^[\]\n]{2,120}\]/g) ?? [])];
}

/** The verbs a draft puts in front of a blank: "Enter Hold Status". */
const LABEL_VERB = /^(enter|insert|specify|provide|fill in|fill|input|write|give|mention)\s+/;

/**
 * A blank the letter names but we do not.
 *
 * The model invents labels we will never finish enumerating — one letter asked
 * for a hold status, a recoverable amount and an investigating officer's action
 * status, none of which is a field on a case. Treating those as prose left six
 * inputs missing from the panel and six brackets in a letter somebody was about
 * to hand to a bank. So an unrecognised label becomes a field of its own, named
 * after the words the letter used, and its answer is kept on the case.
 */
function fieldFromLetter(bracket: string): PlaceholderField {
  const key = inner(bracket);
  // Labelled in the letter's own casing, not ours. Lowercasing it first turned
  // "IO Action Status" into "Io action status", which is how an investigating
  // officer stops being one.
  const written = bracket.slice(1, -1).trim().replace(/\s+/g, " ");
  const words = written.replace(new RegExp(LABEL_VERB.source, "i"), "").trim() || written;
  return {
    id: `letter:${key}`,
    // Never scanned for; built on demand for the bracket that produced it.
    match: /$^/,
    labelText: words,
    kind: words.length > 48 ? "textarea" : "text",
    read: (caseFile) => caseFile.fills?.[key] ?? "",
    write: (value, caseFile) => {
      const fills = { ...caseFile.fills };
      // An emptied answer is removed rather than stored blank, so a case does
      // not accumulate the debris of every draft it has ever had.
      if (value.trim()) fills[key] = value;
      else delete fills[key];
      return { fills };
    },
  };
}

export function classifyBracket(bracket: string): Gap {
  const content = inner(bracket);
  const field = PLACEHOLDER_FIELDS.find((candidate) => candidate.match.test(content));
  if (field) return { text: bracket, kind: "field", field };
  if (FOR_OTHERS.test(content)) return { text: bracket, kind: "for-others" };

  // A sentence is addressed to the reader; a label is a hole in the form. The
  // difference decides whether somebody gets an input box or a paragraph to
  // read, so it is drawn on how the words are written, not on what they mean.
  const isSentence = READER_NOTE.test(content)
    || /[.!?]$/.test(content)
    || content.split(" ").length > 7;
  if (isSentence) return { text: bracket, kind: "note" };

  return { text: bracket, kind: "field", field: fieldFromLetter(bracket) };
}

export function readGaps(text: string): Gap[] {
  return bracketsIn(text).map(classifyBracket);
}

/**
 * Reading order for the panel, which is not matching order.
 *
 * The registry above is sequenced so that "bank name" is tried before "name";
 * a form that asked in that order would be a strange thing to fill in. This is
 * the order a person answers questions about themselves in.
 */
const DISPLAY_ORDER = [
  "name", "phone", "email", "address", "state", "policeStation",
  "bankName", "branchAddress", "accountLast4", "bankNotifiedAt", "bankAck",
  "ncrpAck", "incidentAt", "suspectPhone", "story",
];

/**
 * The gaps this particular document has, as fields.
 *
 * Only what is actually in the text: an NCRP description does not ask for a
 * branch address, and a panel that offers one anyway is a panel nobody reads.
 */
export function findPlaceholders(text: string): PlaceholderField[] {
  const found = new Map<string, PlaceholderField>();
  for (const gap of readGaps(text)) {
    if (gap.field && !found.has(gap.field.id)) found.set(gap.field.id, gap.field);
  }
  const rank = (id: string) => {
    const index = DISPLAY_ORDER.indexOf(id);
    // Gaps the letter named itself come after the ones we know, in the order
    // the letter asks for them.
    return index === -1 ? DISPLAY_ORDER.length : index;
  };
  return [...found.values()].sort((a, b) => rank(a.id) - rank(b.id));
}

function asPattern(bracket: string): RegExp {
  return new RegExp(bracket.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
}

/** Put the answers into the draft. Untouched gaps stay visible, on purpose. */
export function fillDocument(text: string, caseFile: CaseFile): string {
  let filled = text;
  for (const gap of readGaps(text)) {
    if (!gap.field) continue;
    const raw = gap.field.read(caseFile).trim();
    if (!raw) continue;
    const value = gap.field.format ? gap.field.format(raw) : raw;
    filled = filled.replace(asPattern(gap.text), value);
  }
  return filled;
}

/**
 * What still stands between this draft and a counter.
 *
 * A block the bank fills in is not the person's problem and is not counted.
 * Everything else is: an unanswered field, and an instruction the draft leaves
 * for them to resolve, both stop a letter being submittable as it stands.
 */
export function remainingGaps(text: string, caseFile: CaseFile): Gap[] {
  return readGaps(text).filter((gap) => {
    if (gap.kind === "for-others") return false;
    if (gap.kind === "note") return true;
    return !gap.field?.read(caseFile).trim();
  });
}
