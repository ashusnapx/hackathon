import { CATEGORIES, findCategory } from "@/lib/case/categories";
import { EMPTY_ENTITIES, type Entities, type Triage } from "@/lib/case/types";
import type { MoneyAnswer } from "./interview";
import type { RbiInitiation } from "@/lib/legal/rbi";

/**
 * Turn Vaani's post-call extraction into case facts, and work out what is
 * actually left for a model to do.
 *
 * The agent already asked the questions and the provider already returned them
 * as fields. Sending the same conversation to an LLM to re-derive an amount the
 * caller said out loud is slower, costs money, and adds a second chance to get
 * it wrong. So everything concrete is taken as-is, and the model is called only
 * for the two things Vaani does not produce: which of our categories this is,
 * when its own label does not match one, and a formal English account when the
 * provider did not write a chronology.
 *
 * Nothing here is treated as confirmed. It lands in the draft the same way a
 * model's reading would — for the person to correct before anything is filed.
 */

export interface VaaniCallFacts {
  triage: Partial<Triage>;
  entities: Entities;
  moneyMoved?: MoneyAnswer;
  transactionInitiation?: RbiInitiation;
  callerName?: string;
  bankName?: string;
  state?: string;
  district?: string;
  evidenceText?: string;
  priorReporting?: string;
  desiredHelp?: string;
  /** True when the model still has something to add. */
  needsModel: boolean;
  /** What the model is being asked for, so the reason is inspectable. */
  modelNeededFor: string[];
  /** How many concrete fields came straight from the call. */
  filledFromCall: number;
}

const text = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed && trimmed.toLowerCase() !== "null" ? trimmed : undefined;
};

const list = (value: unknown): string[] => {
  const single = text(value);
  return single ? [single] : [];
};

/**
 * Match Vaani's own words for the incident against the NCRP category tree.
 *
 * The taxonomy already carries the vocabulary — "investment", "digital arrest",
 * "sextortion" — so this is a lookup, not a judgement. A tie or a miss returns
 * nothing and the model is asked instead.
 */
export function matchCategory(...phrases: (string | undefined)[]): {
  categoryId: string;
  subcategoryId?: string;
  confidence: number;
} | null {
  const haystack = phrases.filter(Boolean).join(" ").toLowerCase();
  if (!haystack) return null;

  let best: { categoryId: string; subcategoryId: string; score: number } | null = null;
  for (const category of CATEGORIES) {
    for (const sub of category.subcategories) {
      for (const hint of sub.hints) {
        if (hint.length < 3 || !haystack.includes(hint)) continue;
        const score = hint.length;
        if (!best || score > best.score) {
          best = { categoryId: category.id, subcategoryId: sub.id, score };
        }
      }
    }
  }
  if (!best) return null;
  // Longer, more specific vocabulary is stronger evidence than a three-letter
  // hit, but never certainty: this is a routing guess the caller can reject.
  return {
    categoryId: best.categoryId,
    subcategoryId: best.subcategoryId,
    confidence: best.score >= 8 ? 0.8 : 0.6,
  };
}

/** ISO date from Vaani's timing field, which may be a date or a phrase. */
function incidentDate(value: unknown): string | undefined {
  const raw = text(value);
  if (!raw) return undefined;
  const iso = raw.match(/\d{4}-\d{2}-\d{2}/);
  if (iso) {
    const parsed = new Date(`${iso[0]}T00:00:00Z`);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return undefined;
}

/**
 * "approved" means the caller performed the payment action, even if they were
 * deceived into it. That is not the same as an unauthorised transaction, and
 * the RBI screening turns on exactly this distinction.
 */
function initiation(value: unknown): RbiInitiation | undefined {
  const raw = text(value)?.toLowerCase();
  if (!raw) return undefined;
  if (/not initiated|without|never|no action|unauthorised|unauthorized/.test(raw)) return "not-victim";
  if (/approv|scan|tap|paid|sent|entered|shared|pressur|deceiv/.test(raw)) return "victim";
  return "unknown";
}

export function mapVaaniCall(extracted: Record<string, unknown>): VaaniCallFacts {
  const entities: Entities = {
    ...EMPTY_ENTITIES,
    upiIds: list(extracted.suspect_upi),
    phones: list(extracted.suspect_phone),
    emails: list(extracted.suspect_email),
    urls: list(extracted.suspect_url),
    refs: list(extracted.transaction_reference),
    apps: [text(extracted.payment_method), text(extracted.compromised_account)].filter(Boolean) as string[],
    accounts: [],
    handles: [],
  };

  const amountRaw = extracted.amount_inr;
  const amount = typeof amountRaw === "number" && Number.isFinite(amountRaw) && amountRaw > 0
    ? amountRaw
    : undefined;

  const category = matchCategory(text(extracted.possible_category), text(extracted.chronology_draft));
  const englishNarrative = text(extracted.chronology_draft);

  const modelNeededFor: string[] = [];
  if (!category) modelNeededFor.push("category");
  if (!englishNarrative) modelNeededFor.push("english-narrative");

  // Which remedies apply is a property of the category, not a judgement call:
  // the taxonomy already says so, and the deadline engine reads it.
  const tracks = category ? findCategory(category.categoryId)?.tracks ?? [] : [];
  const recent = triageUrgency(moneyMovedFrom(extracted), incidentDate(extracted.incident_timing));

  const triage: Partial<Triage> = {
    ...(tracks.length ? { applicableTracks: tracks } : {}),
    urgency: recent,
    ...(category ? { categoryId: category.categoryId, subcategoryId: category.subcategoryId } : {}),
    ...(category ? { confidence: category.confidence } : {}),
    ...(amount !== undefined ? { amount } : {}),
    ...(incidentDate(extracted.incident_timing) ? { incidentAt: incidentDate(extracted.incident_timing) } : {}),
    ...(englishNarrative ? { englishNarrative } : {}),
  };

  const moneyMoved = moneyMovedFrom(extracted);

  const filledFromCall = [
    amount, triage.incidentAt, triage.categoryId, englishNarrative, moneyMoved,
    text(extracted.bank_name), text(extracted.state), text(extracted.district),
    ...entities.upiIds, ...entities.phones, ...entities.emails, ...entities.urls,
    ...entities.refs, ...entities.apps,
  ].filter(Boolean).length;

  return {
    triage,
    entities,
    moneyMoved,
    transactionInitiation: initiation(extracted.transaction_authorisation),
    callerName: text(extracted.caller_name),
    bankName: text(extracted.bank_name),
    state: text(extracted.state),
    district: text(extracted.district),
    evidenceText: text(extracted.evidence_available),
    priorReporting: text(extracted.prior_reporting_status),
    desiredHelp: text(extracted.desired_help),
    needsModel: modelNeededFor.length > 0,
    modelNeededFor,
    filledFromCall,
  };
}

function moneyMovedFrom(extracted: Record<string, unknown>): MoneyAnswer | undefined {
  if (extracted.money_moved === true) return "yes";
  if (extracted.money_moved === false) return "no";
  return undefined;
}

/**
 * Money that left in the last day is the only thing here that is time-critical:
 * it is the window in which a bank and 1930 can still act.
 */
function triageUrgency(moneyMoved: MoneyAnswer | undefined, incidentAt?: string): Triage["urgency"] {
  if (moneyMoved !== "yes") return "moderate";
  if (!incidentAt) return "high";
  const hours = (Date.now() - new Date(incidentAt).getTime()) / 3_600_000;
  return hours <= 24 ? "critical" : "high";
}
