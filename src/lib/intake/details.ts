import { findCategory } from "@/lib/case/categories";
import { properName } from "./name";
import type { DictKey } from "@/lib/i18n/dict/en";
import type { IncidentTiming, IntakeDraft } from "./interview";

/**
 * The questions that stand between a case file and a document somebody can hand
 * over.
 *
 * The interview up to this point establishes what happened. That is enough to
 * route the case and start the clocks, and it is not enough to write a letter:
 * a bank dispute needs a name, an account, a branch and a time; an FIR
 * application needs an address and a police station; the NCRP text needs the
 * account the money went to. Without these the drafts come out full of square
 * brackets, and the person fills them in by hand at the counter — which is the
 * exact moment this product exists to remove.
 *
 * So the assistant asks. The ids here deliberately match the placeholder ids in
 * `lib/case/placeholders.ts`: these are the same holes, closed a step earlier,
 * while somebody is still in a conversation rather than staring at a draft.
 *
 * Three rules keep a long list from becoming an interrogation:
 *
 *  - Nothing already known is asked. Vaani's extraction and the model's reading
 *    of the narrative fill most of these; `read` looks there first, and a
 *    question with an answer never appears.
 *  - Nothing irrelevant is asked. A sextortion case is never asked for a UPI id.
 *  - Every question can be skipped, one at a time or all at once. A skipped
 *    question leaves the bracket in the letter, which is honest, and the panel
 *    beside the document will ask again later.
 */

export type DetailKind = "text" | "tel" | "email" | "amount" | "datetime" | "textarea";

/**
 * Which part of the case a question belongs to.
 *
 * The chat asks them one at a time; the form beside it shows them all at once,
 * and a form needs headings. One catalogue drives both, so a question added
 * here appears in the conversation and on the form together, and neither can
 * drift from the other.
 */
export type DetailGroup = "you" | "bank" | "money" | "suspect" | "filed";

/**
 * Which side of the account of what happened a question sits on.
 *
 * "intro" is who we are talking to — a name, a number, an address. None of it
 * depends on knowing what the fraud was, all of it is needed by every document
 * this produces, and asking it first means the form beside the chat starts
 * filling from the very first answer rather than staying empty through the
 * longest question in the interview.
 *
 * "case" is everything that only makes sense once the story has been read: the
 * amount, the bank, the stranger's UPI id, the police station. Asking for a UPI
 * id before knowing this is a sextortion case would be noise, and asking a
 * victim of a fraud an hour old for twenty details before letting them say a
 * word would be worse than noise.
 */
export type DetailPhase = "intro" | "case";

export const DETAIL_GROUPS: { id: DetailGroup; label: DictKey }[] = [
  { id: "you", label: "detail.groupYou" },
  { id: "bank", label: "detail.groupBank" },
  { id: "money", label: "detail.groupMoney" },
  { id: "suspect", label: "detail.groupSuspect" },
  { id: "filed", label: "detail.groupFiled" },
];

export interface DetailQuestion {
  id: string;
  group: DetailGroup;
  phase: DetailPhase;
  /** The question, as the assistant asks it. */
  question: DictKey;
  /** The same thing named as a form field, two or three words. */
  label: DictKey;
  /** Why it is being asked, in one line. Shown under the field. */
  why: DictKey;
  /**
   * Where to go and look for it.
   *
   * The difference between a form somebody abandons and one they finish is
   * usually not willingness — it is not knowing that the UTR is the long number
   * in the bank's SMS, or that the branch is on the first page of the passbook.
   * Asking for a thing without saying where it lives is asking them to give up.
   */
  where?: DictKey;
  placeholder: DictKey;
  kind: DetailKind;
  /** Worth asking at all, for this kind of case. */
  applies(draft: IntakeDraft): boolean;
  /** What is already known. A non-empty answer means the question is settled. */
  read(draft: IntakeDraft): string;
  write(value: string, draft: IntakeDraft): Partial<IntakeDraft>;
  /** How the answer reads back in the transcript of the chat. */
  format?(value: string): string;
}

const moneyGone = (draft: IntakeDraft) => draft.moneyMoved === "yes";

/** Which of the app's four windows a real timestamp falls into. */
function bucketFor(iso: string, now: number): IncidentTiming | undefined {
  const at = new Date(iso).getTime();
  if (!Number.isFinite(at)) return undefined;
  const ago = now - at;
  if (ago < 0) return undefined;
  if (ago <= 60 * 60_000) return "last-hour";
  const today = new Date(now);
  const then = new Date(at);
  return today.toDateString() === then.toDateString() ? "today" : "older";
}

const hasTrack = (draft: IntakeDraft, track: string) =>
  (draft.analysis?.triage.applicableTracks ?? []).includes(track as never);

/** True for the frauds where a stranger's account, UPI id or number exists at all. */
const financial = (draft: IntakeDraft) =>
  findCategory(draft.analysis?.triage.categoryId)?.portalTrack === "financial";

const detail = (draft: IntakeDraft, id: string) => draft.details?.[id]?.trim() ?? "";

const putDetail = (draft: IntakeDraft, id: string, value: string): Partial<IntakeDraft> => {
  const next = { ...(draft.details ?? {}) };
  const clean = value.trim();
  if (clean) next[id] = clean;
  else delete next[id];
  return { details: next };
};

/**
 * Put a value at the head of one of the extracted lists.
 *
 * The same field is a question in the chat and a box on the form, and it has to
 * mean the same thing in both: in the chat the list is empty, so this appends;
 * on the form it corrects the entry the person is looking at. Anything already
 * somewhere in the list is left exactly where it is rather than duplicated.
 */
const setFirstEntity = (
  draft: IntakeDraft,
  field: "phones" | "upiIds" | "accounts" | "refs" | "urls" | "handles",
  value: string,
): Partial<IntakeDraft> => {
  const analysis = draft.analysis;
  const clean = value.trim();
  if (!analysis || !clean) return {};
  const current = analysis.entities[field];
  if (current.some((item) => item.toLowerCase() === clean.toLowerCase())) return {};
  const next = current.length ? [clean, ...current.slice(1)] : [clean];
  return {
    analysis: {
      ...analysis,
      entities: { ...analysis.entities, [field]: next },
    },
  };
};

const firstEntity = (
  draft: IntakeDraft,
  field: "phones" | "upiIds" | "accounts" | "refs" | "urls" | "handles",
) => draft.analysis?.entities[field][0]?.trim() ?? "";

/** An account number is a secret; only the tail belongs in a case file. */
const last4 = (value: string) => value.replace(/\D/g, "").slice(-4);

/**
 * Read an amount the way somebody says it, not only the way a form wants it.
 *
 * The microphone is the whole point of this interview for anyone who does not
 * type comfortably, and it returns "forty seven thousand five hundred", not
 * 47500. Refusing that — while offering a mic — would be the app ignoring
 * exactly the person it is built for. Digits still win when digits are present.
 */
const UNITS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fourty: 40,
  fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

/** Hundred and thousand are Western; lakh and crore are how the amount is said here. */
const SCALES: Record<string, number> = {
  hundred: 100, hundreds: 100,
  thousand: 1_000, thousands: 1_000, k: 1_000,
  lakh: 100_000, lakhs: 100_000, lac: 100_000, lacs: 100_000,
  crore: 10_000_000, crores: 10_000_000, cr: 10_000_000,
};

export function parseIndianAmount(input: string): number {
  const text = input
    .toLowerCase()
    // Indian grouping first: a comma between two digits is punctuation inside
    // one number, and turning it into a separator reads ₹47,500 as ₹47.
    .replace(/(\d),(?=\d)/g, "$1")
    .replace(/₹/g, " ")
    .replace(/\brs\.?\b|\brupees?\b|\bonly\b|\band\b/g, " ");

  let total = 0;
  let group = 0;
  let heard = false;
  for (const token of text.split(/[^a-z0-9.]+/)) {
    if (!token) continue;
    if (/^\d+(?:\.\d+)?$/.test(token)) {
      group += Number(token);
      heard = true;
      continue;
    }
    if (token in UNITS) {
      group += UNITS[token];
      heard = true;
      continue;
    }
    const scale = SCALES[token];
    if (!scale) continue;
    heard = true;
    // A lakh closes the group before it; a hundred multiplies it.
    if (scale >= 1_000) {
      total += (group || 1) * scale;
      group = 0;
    } else {
      group = (group || 1) * scale;
    }
  }
  return heard ? Math.round(total + group) : 0;
}

const isoOrEmpty = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
};

/** `datetime-local` wants "YYYY-MM-DDTHH:mm" in local time, not an ISO instant. */
export function localDateTimeValue(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const dateTimeWords = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
};

/**
 * Ordered the way a person answers them: who you are, then your bank, then the
 * money, then the stranger, then what you have already filed. Anything that
 * makes a document unusable comes before anything that merely improves one.
 */
export const DETAIL_QUESTIONS: DetailQuestion[] = [
  {
    id: "name",
    group: "you",
    phase: "intro",
    label: "detail.nameLabel",
    question: "detail.nameQ",
    why: "detail.nameWhy",
    where: "detail.nameWhere",
    placeholder: "detail.namePlaceholder",
    kind: "text",
    applies: () => true,
    read: (draft) => draft.callerName?.trim() ?? "",
    // Written the way they would write it, because this ends up at the head of
    // a letter to their bank and on an FIR application.
    write: (value) => ({ callerName: properName(value) || undefined }),
  },
  {
    id: "phone",
    group: "you",
    phase: "intro",
    label: "detail.phoneLabel",
    question: "detail.phoneQ",
    why: "detail.phoneWhy",
    where: "detail.phoneWhere",
    placeholder: "detail.phonePlaceholder",
    kind: "tel",
    applies: () => true,
    read: (draft) => detail(draft, "phone"),
    write: (value, draft) => putDetail(draft, "phone", value),
  },
  {
    id: "email",
    group: "you",
    phase: "intro",
    label: "detail.emailLabel",
    question: "detail.emailQ",
    why: "detail.emailWhy",
    where: "detail.emailWhere",
    placeholder: "detail.emailPlaceholder",
    kind: "email",
    applies: () => true,
    read: (draft) => detail(draft, "email"),
    write: (value, draft) => putDetail(draft, "email", value),
  },
  {
    id: "address",
    group: "you",
    phase: "intro",
    label: "detail.addressLabel",
    question: "detail.addressQ",
    why: "detail.addressWhy",
    where: "detail.addressWhere",
    placeholder: "detail.addressPlaceholder",
    kind: "textarea",
    applies: () => true,
    read: (draft) => detail(draft, "address"),
    write: (value, draft) => putDetail(draft, "address", value),
  },
  {
    id: "bankName",
    group: "bank",
    phase: "case",
    label: "detail.bankNameLabel",
    question: "detail.bankNameQ",
    why: "detail.bankNameWhy",
    where: "detail.bankNameWhere",
    placeholder: "detail.bankNamePlaceholder",
    kind: "text",
    applies: (draft) => moneyGone(draft) || hasTrack(draft, "bank-notice"),
    read: (draft) => draft.bankName?.trim() ?? "",
    write: (value) => ({ bankName: value.trim() || undefined }),
  },
  {
    id: "accountLast4",
    group: "bank",
    phase: "case",
    label: "detail.accountLast4Label",
    question: "detail.accountQ",
    why: "detail.accountWhy",
    where: "detail.accountLast4Where",
    placeholder: "detail.accountPlaceholder",
    kind: "tel",
    applies: (draft) => moneyGone(draft) || hasTrack(draft, "bank-notice"),
    read: (draft) => detail(draft, "accountLast4"),
    // Whatever is typed, only the last four digits are kept — a full account
    // number is not needed by any of these letters and would be stored here.
    write: (value, draft) => putDetail(draft, "accountLast4", last4(value)),
  },
  {
    id: "branchAddress",
    group: "bank",
    phase: "case",
    label: "detail.branchAddressLabel",
    question: "detail.branchQ",
    why: "detail.branchWhy",
    where: "detail.branchAddressWhere",
    placeholder: "detail.branchPlaceholder",
    kind: "textarea",
    applies: (draft) => moneyGone(draft) || hasTrack(draft, "bank-notice"),
    read: (draft) => detail(draft, "branchAddress"),
    write: (value, draft) => putDetail(draft, "branchAddress", value),
  },
  {
    id: "amount",
    group: "money",
    phase: "case",
    label: "detail.amountLabel",
    question: "detail.amountQ",
    why: "detail.amountWhy",
    where: "detail.amountWhere",
    placeholder: "detail.amountPlaceholder",
    kind: "amount",
    applies: moneyGone,
    read: (draft) => draft.analysis?.triage.amount ? String(draft.analysis.triage.amount) : "",
    write: (value, draft) => {
      const analysis = draft.analysis;
      const amount = parseIndianAmount(value);
      if (!analysis || amount <= 0) return {};
      return { analysis: { ...analysis, triage: { ...analysis.triage, amount } } };
    },
  },
  {
    id: "incidentAt",
    group: "money",
    phase: "case",
    label: "detail.incidentAtLabel",
    question: "detail.incidentAtQ",
    why: "detail.incidentAtWhy",
    where: "detail.incidentAtWhere",
    placeholder: "detail.incidentAtPlaceholder",
    kind: "datetime",
    // Asked of every case, not only the ones with money in them: a complaint
    // about a profile is dated too, and the FIR application says when.
    applies: () => true,
    read: (draft) => draft.analysis?.triage.incidentAt ?? "",
    write: (value, draft) => {
      const analysis = draft.analysis;
      const incidentAt = isoOrEmpty(value);
      if (!analysis || !incidentAt) return {};
      return {
        analysis: { ...analysis, triage: { ...analysis.triage, incidentAt } },
        // The bucket the rest of the app reasons in — the recovery window, the
        // urgency of the 1930 call — falls out of the real timestamp. Nobody
        // has to be asked to pick it.
        incidentTiming: bucketFor(incidentAt, Date.now()),
      };
    },
    format: dateTimeWords,
  },
  {
    id: "bankAlertAt",
    group: "money",
    phase: "case",
    label: "detail.bankAlertAtLabel",
    question: "detail.bankAlertQ",
    why: "detail.bankAlertWhy",
    where: "detail.bankAlertAtWhere",
    placeholder: "detail.bankAlertPlaceholder",
    kind: "datetime",
    applies: moneyGone,
    read: (draft) => draft.bankAlertAt ?? "",
    write: (value) => {
      const bankAlertAt = isoOrEmpty(value);
      return bankAlertAt ? { bankAlertAt } : {};
    },
    format: dateTimeWords,
  },
  {
    id: "bankNotifiedAt",
    group: "money",
    phase: "case",
    label: "detail.bankNotifiedAtLabel",
    question: "detail.bankNotifiedQ",
    why: "detail.bankNotifiedWhy",
    where: "detail.bankNotifiedAtWhere",
    placeholder: "detail.bankNotifiedPlaceholder",
    kind: "datetime",
    // Asked of anybody whose money moved, and worded so that "I have not told
    // them yet" is an answer. It used to wait for the RBI screening to say the
    // bank had been told, which meant this round of questions could re-open
    // after it — and the conversation cannot be replayed out of order.
    applies: moneyGone,
    read: (draft) => detail(draft, "bankNotifiedAt"),
    write: (value, draft) => putDetail(draft, "bankNotifiedAt", isoOrEmpty(value)),
    format: dateTimeWords,
  },
  {
    id: "utr",
    group: "money",
    phase: "case",
    label: "detail.utrLabel",
    question: "detail.utrQ",
    why: "detail.utrWhy",
    where: "detail.utrWhere",
    placeholder: "detail.utrPlaceholder",
    kind: "text",
    applies: moneyGone,
    read: (draft) => firstEntity(draft, "refs"),
    write: (value, draft) => setFirstEntity(draft, "refs", value),
  },
  {
    id: "suspectUpi",
    group: "suspect",
    phase: "case",
    label: "detail.suspectUpiLabel",
    question: "detail.suspectUpiQ",
    why: "detail.suspectUpiWhy",
    where: "detail.suspectUpiWhere",
    placeholder: "detail.suspectUpiPlaceholder",
    kind: "text",
    applies: (draft) => moneyGone(draft) && financial(draft),
    read: (draft) => firstEntity(draft, "upiIds"),
    write: (value, draft) => setFirstEntity(draft, "upiIds", value),
  },
  {
    id: "suspectAccount",
    group: "suspect",
    phase: "case",
    label: "detail.suspectAccountLabel",
    question: "detail.suspectAccountQ",
    why: "detail.suspectAccountWhy",
    where: "detail.suspectAccountWhere",
    placeholder: "detail.suspectAccountPlaceholder",
    kind: "text",
    applies: (draft) => moneyGone(draft) && financial(draft),
    read: (draft) => firstEntity(draft, "accounts"),
    write: (value, draft) => setFirstEntity(draft, "accounts", value),
  },
  {
    id: "suspectPhone",
    group: "suspect",
    phase: "case",
    label: "detail.suspectPhoneLabel",
    question: "detail.suspectPhoneQ",
    why: "detail.suspectPhoneWhy",
    where: "detail.suspectPhoneWhere",
    placeholder: "detail.suspectPhonePlaceholder",
    kind: "tel",
    applies: () => true,
    read: (draft) => firstEntity(draft, "phones"),
    write: (value, draft) => setFirstEntity(draft, "phones", value),
  },
  {
    id: "suspectUrl",
    group: "suspect",
    phase: "case",
    label: "detail.suspectUrlLabel",
    question: "detail.suspectUrlQ",
    why: "detail.suspectUrlWhy",
    where: "detail.suspectUrlWhere",
    placeholder: "detail.suspectUrlPlaceholder",
    kind: "text",
    applies: () => true,
    read: (draft) => firstEntity(draft, "urls"),
    write: (value, draft) => setFirstEntity(draft, "urls", value),
  },
  {
    id: "suspectHandle",
    group: "suspect",
    phase: "case",
    label: "detail.suspectHandleLabel",
    question: "detail.suspectHandleQ",
    why: "detail.suspectHandleWhy",
    where: "detail.suspectHandleWhere",
    placeholder: "detail.suspectHandlePlaceholder",
    kind: "text",
    // Where the crime happened on a profile rather than in a payment app. It
    // waits for the category, so a form that has not been told what happened
    // yet does not open with a box asking for the stranger's username.
    applies: (draft) => Boolean(draft.analysis) && !financial(draft),
    read: (draft) => firstEntity(draft, "handles"),
    write: (value, draft) => setFirstEntity(draft, "handles", value),
  },
  {
    id: "ncrpAck",
    group: "filed",
    phase: "case",
    label: "detail.ncrpAckLabel",
    question: "detail.ncrpAckQ",
    why: "detail.ncrpAckWhy",
    where: "detail.ncrpAckWhere",
    placeholder: "detail.ncrpAckPlaceholder",
    kind: "text",
    applies: (draft) => hasTrack(draft, "ncrp"),
    read: (draft) => detail(draft, "ncrpAck"),
    write: (value, draft) => putDetail(draft, "ncrpAck", value),
  },
  {
    id: "bankAck",
    group: "filed",
    phase: "case",
    label: "detail.bankAckLabel",
    question: "detail.bankAckQ",
    why: "detail.bankAckWhy",
    where: "detail.bankAckWhere",
    placeholder: "detail.bankAckPlaceholder",
    kind: "text",
    applies: moneyGone,
    read: (draft) => detail(draft, "bankAck"),
    write: (value, draft) => putDetail(draft, "bankAck", value),
  },
  {
    id: "policeStation",
    group: "filed",
    phase: "case",
    label: "detail.policeStationLabel",
    question: "detail.policeStationQ",
    why: "detail.policeStationWhy",
    where: "detail.policeStationWhere",
    placeholder: "detail.policeStationPlaceholder",
    kind: "text",
    applies: (draft) => hasTrack(draft, "fir"),
    read: (draft) => detail(draft, "policeStation"),
    write: (value, draft) => putDetail(draft, "policeStation", value),
  },
];

/**
 * Which questions this interview has already put to the person.
 *
 * One list does the work of two. A question that was asked and has no answer
 * was skipped; a question that was asked and has one was answered; a question
 * that is not on the list has never been in front of anybody — which is the
 * case for everything Vaani or the model supplied, and the reason the chat does
 * not show a transcript of questions nobody was asked.
 *
 * It also catches an answer that could not be stored — an amount typed as
 * words the parser could not read — as a skip rather than as a question that
 * asks itself forever.
 */
const asked = (draft: IntakeDraft) => new Set(draft.detailsAsked ?? []);

/** Every question this particular case needs an answer to. */
export function detailsForCase(draft: IntakeDraft, phase?: DetailPhase): DetailQuestion[] {
  return DETAIL_QUESTIONS.filter(
    (question) => (!phase || question.phase === phase) && question.applies(draft),
  );
}

/** The one to ask now, or nothing when the list is finished. */
export function nextDetail(draft: IntakeDraft, phase?: DetailPhase): DetailQuestion | undefined {
  const seen = asked(draft);
  return detailsForCase(draft, phase).find(
    (question) => !seen.has(question.id) && !question.read(draft),
  );
}

/** What was put to the person, in the order it was put, for the chat log. */
export function askedDetails(
  draft: IntakeDraft,
  phase?: DetailPhase,
): { question: DetailQuestion; answer: string }[] {
  const seen = asked(draft);
  return detailsForCase(draft, phase)
    .filter((question) => seen.has(question.id))
    .map((question) => ({ question, answer: question.read(draft) }));
}

/**
 * How far through the follow-ups we are.
 *
 * `known` counts what the call and the model already supplied, so somebody who
 * arrives from a Vaani call sees most of the list already settled before
 * answering anything — which is the truth, and the reason it is not as long as
 * it looks.
 */
export function detailProgress(draft: IntakeDraft): {
  total: number; settled: number; answered: number; known: number; remaining: number; position: number;
} {
  const questions = detailsForCase(draft);
  const seen = asked(draft);
  const known = questions.filter(
    (question) => Boolean(question.read(draft)) && !seen.has(question.id),
  ).length;
  const settled = questions.filter(
    (question) => Boolean(question.read(draft)) || seen.has(question.id),
  ).length;
  return {
    total: questions.length,
    settled,
    known,
    answered: settled - known,
    remaining: questions.length - settled,
    // Where the current question sits in the list a person is actually walked
    // through — the ones already filled in for them are not questions.
    position: settled - known + 1,
  };
}

export function detailsComplete(draft: IntakeDraft, phase?: DetailPhase): boolean {
  return nextDetail(draft, phase) === undefined;
}

/** The one question asked before the story: what to call them. */
export const NAME_QUESTION = DETAIL_QUESTIONS.find((question) => question.id === "name")!;

/**
 * Whether the assistant has a name to use, or has already asked for one.
 *
 * It is asked first, before the account of what happened, for two reasons: a
 * stranger asking you to describe the worst hour of your week should introduce
 * itself and learn your name first, and every letter this produces is signed
 * with it. Declining is an answer — the question is then never asked again.
 */
export function nameAnswered(draft: IntakeDraft): boolean {
  return Boolean(draft.callerName?.trim()) || (draft.detailsAsked ?? []).includes(NAME_QUESTION.id);
}

/** Record an answer, and note that the question has now been put. */
export function answerDetail(
  draft: IntakeDraft,
  question: DetailQuestion,
  value: string,
): Partial<IntakeDraft> {
  const seen = asked(draft);
  seen.add(question.id);
  return { ...question.write(value, draft), detailsAsked: [...seen] };
}

/** Mark one question as put and passed over, without recording an answer. */
export function skipDetail(draft: IntakeDraft, id: string): Partial<IntakeDraft> {
  const seen = asked(draft);
  seen.add(id);
  return { detailsAsked: [...seen] };
}

/** Pass over everything still outstanding, in one gesture. */
export function skipRemainingDetails(draft: IntakeDraft): Partial<IntakeDraft> {
  const seen = asked(draft);
  for (const question of detailsForCase(draft)) seen.add(question.id);
  return { detailsAsked: [...seen] };
}

/** The answer as it should read back in the conversation. */
export function detailAnswerText(question: DetailQuestion, value: string): string {
  const clean = value.trim();
  if (!clean) return clean;
  return question.format ? question.format(clean) : clean;
}

/**
 * Whether an answer is worth storing, so the button says so before it is pressed.
 *
 * The alternative is accepting anything and silently dropping what cannot be
 * parsed, which for somebody who dictated an amount would look exactly like the
 * app ignoring them.
 */
export function isDetailAnswer(question: DetailQuestion, value: string): boolean {
  const clean = value.trim();
  if (!clean) return false;
  switch (question.kind) {
    case "amount":
      return parseIndianAmount(clean) > 0;
    case "tel":
      return clean.replace(/\D/g, "").length >= 4;
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
    case "datetime":
      return !Number.isNaN(new Date(clean).getTime());
    default:
      return clean.length >= 2;
  }
}
