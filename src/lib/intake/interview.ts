import type { Entities, Triage } from "@/lib/case/types";
import { detailsComplete, nameAnswered } from "./details";
import type {
  RbiInitiation,
  RbiReportTiming,
  RbiYesNoUnknown,
} from "@/lib/legal/rbi";

/**
 * The interview is deliberately a state machine rather than a stack of form
 * pages. A browser chat and a Vaani call can both pause and resume the
 * same state without translating UI screens into different products.
 */
export type IntakeChannel = "web" | "voice";
export type SafetyAnswer = "safe" | "danger" | "prefer-not";
export type ChildContext = "adult-or-no-child" | "self-minor" | "child-other" | "unknown";
export type MoneyAnswer = "yes" | "no" | "unsure";
export type IncidentTiming = "last-hour" | "today" | "older" | "unsure";

export type EvidenceKind =
  | "transaction"
  | "bank-message"
  | "payment-reference"
  | "chat"
  | "call-log"
  | "email"
  | "link"
  | "none";

export interface IntakeAnalysis {
  triage: Triage;
  entities: Entities;
  /** "vaani" means the facts came from the call itself, not from a model reading it. */
  source: "openai" | "rules" | "vaani";
}

export interface IntakeDraft {
  version: 1;
  channel: IntakeChannel;
  acceptedBoundaries: boolean;
  safety?: SafetyAnswer;
  /** Immediate-danger answers expire; an old "safe" answer must not unlock a resumed narrative. */
  safetyCheckedAt?: string;
  emergencyAcknowledged?: boolean;
  childContext?: ChildContext;
  childSafetyAcknowledged?: boolean;
  moneyMoved?: MoneyAnswer;
  incidentTiming?: IncidentTiming;
  /** Exact receipt time of the bank's transaction communication, if known. */
  bankAlertAt?: string;
  narrative: string;
  /** What the caller asked to be called, so a second call does not ask again. */
  callerName?: string;
  /** Named by the caller on the call; drives the bank and RBI tracks. */
  bankName?: string;
  /** What the caller said they still have, in their own words. */
  evidenceNote?: string;
  /**
   * Answers to the follow-up questions, keyed by question id.
   *
   * These are the facts a document needs and a story does not supply: a postal
   * address, the branch a letter is addressed to, the acknowledgement number of
   * a complaint already filed. They live in one record rather than as twenty
   * optional fields because the catalogue in `details.ts` owns the list, and
   * adding a question there should not mean editing this type.
   */
  details?: Record<string, string>;
  /**
   * Follow-ups already put to the person, answered or not.
   *
   * A question on this list with no answer was skipped, and is not asked again;
   * a question that is not on it has never been in front of anybody, which is
   * true of everything the call or the model supplied.
   */
  detailsAsked?: string[];
  analysis?: IntakeAnalysis;
  analysisConfirmed: boolean;
  /** Material facts for the RBI unauthorised-transaction screening. */
  transactionInitiation?: RbiInitiation;
  credentialsShared?: RbiYesNoUnknown;
  suspectedBankFault?: RbiYesNoUnknown;
  bankReportTiming?: RbiReportTiming;
  rbiAssessmentReviewed: boolean;
  evidence?: EvidenceKind[];
  /** In-progress checklist choices, persisted without advancing the interview. */
  pendingEvidence?: EvidenceKind[];
  files: { name: string; size: number; type: string }[];
  state?: string;
  district?: string;
  routingAnswered: boolean;
}

export type IntakeStep =
  | "boundaries"
  | "safety"
  | "emergency"
  | "age"
  | "child-safety"
  | "money"
  | "timing"
  | "name"
  | "story"
  | "verify"
  | "rbi-initiation"
  | "rbi-credentials"
  | "rbi-bank-fault"
  | "rbi-report-timing"
  | "rbi-review"
  | "evidence"
  | "routing"
  | "details"
  | "ready";

export function emptyIntake(channel: IntakeChannel = "web"): IntakeDraft {
  return {
    version: 1,
    channel,
    acceptedBoundaries: false,
    narrative: "",
    analysisConfirmed: false,
    rbiAssessmentReviewed: false,
    files: [],
    routingAnswered: false,
  };
}

/**
 * The draft that pressing Start produces.
 *
 * Built from empty every time, on purpose. It used to be patched onto whatever
 * was already stored, so that somebody who had typed their account and pressed
 * Start again did not lose it — but the cost was that every new report began
 * carrying the last one's narrative, its extracted amount and its bank. "Start"
 * has to mean start; a half-finished interview is resumable from the same
 * screen it was abandoned on, without being inherited by the next person to use
 * the phone.
 */
export function freshStartDraft(
  channel: IntakeChannel,
  answers: { safety?: SafetyAnswer; childContext?: ChildContext },
  now = new Date(),
): IntakeDraft {
  const { safety, childContext } = answers;
  return {
    ...emptyIntake(channel),
    acceptedBoundaries: true,
    safety,
    safetyCheckedAt: now.toISOString(),
    emergencyAcknowledged: safety && safety !== "safe" ? true : undefined,
    childContext,
    childSafetyAcknowledged: childContext && childContext !== "adult-or-no-child" ? true : undefined,
  };
}

/** One shared definition for every route that can accept a victim narrative. */
export const SAFETY_GATE_TTL_MS = 30 * 60 * 1000;

export function hasCurrentSafetyAnswer(
  draft: IntakeDraft,
  now = new Date(),
): boolean {
  if (!draft.safety || !draft.safetyCheckedAt) return false;
  const checkedAt = new Date(draft.safetyCheckedAt).getTime();
  const age = now.getTime() - checkedAt;
  return Number.isFinite(checkedAt) && age >= 0 && age < SAFETY_GATE_TTL_MS;
}

export function hasCompletedSafetyGate(draft: IntakeDraft, now = new Date()): boolean {
  return Boolean(
    draft.acceptedBoundaries
    && hasCurrentSafetyAnswer(draft, now)
    && (draft.safety !== "danger" || draft.emergencyAcknowledged)
    && draft.childContext
    && (
      (draft.childContext !== "self-minor" && draft.childContext !== "child-other")
      || draft.childSafetyAcknowledged
    ),
  );
}

export function nextIntakeStep(draft: IntakeDraft): IntakeStep {
  if (!draft.acceptedBoundaries) return "boundaries";
  if (!hasCurrentSafetyAnswer(draft)) return "safety";
  if (draft.safety === "danger" && !draft.emergencyAcknowledged) return "emergency";
  if (!draft.childContext) return "age";
  if (
    (draft.childContext === "self-minor" || draft.childContext === "child-other")
    && !draft.childSafetyAcknowledged
  ) return "child-safety";
  if (!draft.moneyMoved) return "money";
  if (draft.moneyMoved === "yes" && !draft.incidentTiming) return "timing";
  // Who we are talking to, before what happened to them: a name, then the
  // number, the email and the address every one of these documents needs. The
  // form beside the chat starts filling from the first answer instead of
  // sitting empty through the longest question in the interview.
  if (!nameAnswered(draft)) return "name";
  if (!detailsComplete(draft, "intro")) return "details";
  if (draft.narrative.trim().length < 25 || !draft.analysis) return "story";
  if (!draft.analysisConfirmed) return "verify";
  // And then the rest, which only make sense once the story has been read.
  if (!detailsComplete(draft)) return "details";
  if (draft.moneyMoved === "yes") {
    if (!draft.transactionInitiation) return "rbi-initiation";
    if (draft.transactionInitiation === "not-victim") {
      if (!draft.credentialsShared) return "rbi-credentials";
      if (!draft.suspectedBankFault) return "rbi-bank-fault";
      if (!draft.bankReportTiming) return "rbi-report-timing";
    }
    if (!draft.rbiAssessmentReviewed) return "rbi-review";
  }
  if (draft.evidence === undefined) return "evidence";
  if (!draft.routingAnswered) return "routing";
  return "ready";
}

/** Honest progress: material questions answered, not screens visited. */
export function intakeProgress(draft: IntakeDraft): { answered: number; total: number; percent: number } {
  const checks = [
    draft.acceptedBoundaries,
    hasCurrentSafetyAnswer(draft),
    Boolean(draft.childContext),
    draft.childContext !== "self-minor" && draft.childContext !== "child-other"
      ? true
      : Boolean(draft.childSafetyAcknowledged),
    Boolean(draft.moneyMoved),
    draft.moneyMoved !== "yes" || Boolean(draft.incidentTiming),
    nameAnswered(draft),
    draft.narrative.trim().length >= 25,
    Boolean(draft.analysis && draft.analysisConfirmed),
    draft.moneyMoved !== "yes" || Boolean(draft.transactionInitiation),
    draft.moneyMoved !== "yes" || draft.transactionInitiation !== "not-victim" || Boolean(draft.credentialsShared),
    draft.moneyMoved !== "yes" || draft.transactionInitiation !== "not-victim" || Boolean(draft.suspectedBankFault),
    draft.moneyMoved !== "yes" || draft.transactionInitiation !== "not-victim" || Boolean(draft.bankReportTiming),
    draft.moneyMoved !== "yes" || draft.rbiAssessmentReviewed,
    draft.evidence !== undefined,
    draft.routingAnswered,
    detailsComplete(draft),
  ];
  const answered = checks.filter(Boolean).length;
  return { answered, total: checks.length, percent: Math.round((answered / checks.length) * 100) };
}

export function needsFastFinancialAction(draft: IntakeDraft): boolean {
  return draft.moneyMoved === "yes" && (draft.incidentTiming === "last-hour" || draft.incidentTiming === "today");
}

export function timingLabel(timing?: IncidentTiming): string {
  switch (timing) {
    case "last-hour": return "Within the last hour";
    case "today": return "Earlier today";
    case "older": return "Before today";
    default: return "Time not confirmed";
  }
}

/** A coarse answer is not an exact timestamp. Keep only an extracted timestamp
 * for explicit review; the separate range answer remains available as context.
 */
export function timingEstimate(
  _timing: IncidentTiming | undefined,
  extracted: string | undefined,
): string | undefined {
  return extracted;
}

const EVIDENCE_IDS: Record<Exclude<EvidenceKind, "none">, string[]> = {
  transaction: ["txn_screenshot", "bank_statement"],
  "bank-message": ["sms_notification"],
  "payment-reference": ["utr_reference"],
  chat: ["chat_screenshot"],
  "call-log": ["phone_number"],
  email: ["email_correspondence"],
  link: ["website_url"],
};

export function evidenceIdsFor(kinds: EvidenceKind[] = []): string[] {
  return Array.from(
    new Set(kinds.flatMap((kind) => (kind === "none" ? [] : EVIDENCE_IDS[kind]))),
  );
}

/** Convert Vaani's labelled transcript into the victim's own account only. */
export function victimTurnsFromTranscript(transcript: string): string {
  if (!transcript.trim()) return "";
  const chunks = transcript.split(/\b(AGENT|USER|ASSISTANT|VICTIM)\s*:\s*/gi);
  const turns: string[] = [];
  for (let i = 1; i < chunks.length; i += 2) {
    const speaker = chunks[i].toLowerCase();
    const text = (chunks[i + 1] || "")
      // The provider's own furniture rides along with each turn: the timestamp
      // that opens the next line, and an "interrupted" flag. Neither is
      // something the caller said, and both would end up in a police complaint.
      .replace(/\binterrupted\s*:\s*(true|false)/gi, " ")
      .replace(/\[\s*\d{1,2}:\d{2}(:\d{2})?\s*\]/g, " ")
      .replace(/\[\s*\d{4}-\d{2}-\d{2}[^\]]*\]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if ((speaker === "user" || speaker === "victim") && text) turns.push(text);
  }
  // Some deployments return an unlabelled transcript. Preserve it for review
  // rather than silently returning an empty case, but never claim who said it.
  return turns.length ? turns.join(" ") : transcript.replace(/\s+/g, " ").trim();
}

/** Tidy a provider transcript for reading: no synthesis markup, no flags. */
export function cleanCallTranscript(transcript: string): string {
  return transcript
    .replace(/<\/?(?:speed|break|prosody|emphasis|say-as|phoneme|sub|voice|lang|p|s)\b[^>]*>/gi, "")
    .replace(/\binterrupted\s*:\s*(true|false)/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export interface CallTurn { agent: boolean; text: string }

/** Split a transcript into turns, for showing the caller their own call. */
export function callTurns(transcript: string): CallTurn[] {
  const chunks = cleanCallTranscript(transcript).split(/\b(AGENT|USER|ASSISTANT|VICTIM)\s*:\s*/gi);
  const turns: CallTurn[] = [];
  for (let i = 1; i < chunks.length; i += 2) {
    const speaker = chunks[i].toLowerCase();
    const text = (chunks[i + 1] || "")
      .replace(/\[\s*\d{1,2}:\d{2}(:\d{2})?\s*\]/g, " ")
      .replace(/\[\s*\d{4}-\d{2}-\d{2}[^\]]*\]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (text) turns.push({ agent: speaker === "agent" || speaker === "assistant", text });
  }
  return turns;
}
