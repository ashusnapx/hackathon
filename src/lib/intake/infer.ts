import type { IntakeAnalysis, ChildContext, IncidentTiming, IntakeDraft, MoneyAnswer, SafetyAnswer } from "./interview";
import { properName } from "./name";

/**
 * Work out from the story what we would otherwise have asked.
 *
 * Pressing Start used to open with two safety questions and a choice of
 * channel — four taps before anybody could say a word about what had happened
 * to them. Every one of those answers is either already in the account they are
 * about to give, or is a thing we should be watching for rather than making
 * them declare.
 *
 * So the box comes first and this reads the result. Nothing here is a guess
 * dressed as a fact: a field that cannot be settled from the story is left
 * undefined, and the interview asks for it in the ordinary way.
 */

/** Categories where somebody may be under active threat, not just out of pocket. */
const COERCIVE = new Set(["digital-arrest"]);
const COERCIVE_SUB = new Set(["sextortion", "harassment", "loan", "digital-arrest"]);

/** Sub-categories that put a minor in the frame. */
const CHILD_SUB = new Set(["csam"]);

const HOUR_MS = 60 * 60_000;

/**
 * Which bracket an extracted timestamp falls into.
 *
 * The interview asks this as "within the last hour / earlier today / before
 * today", and a model that has already read "this morning" out of the story
 * should not make somebody answer it again.
 */
export function timingFromIncident(incidentAt: string | undefined, now: number): IncidentTiming | undefined {
  if (!incidentAt) return undefined;
  const at = new Date(incidentAt).getTime();
  if (!Number.isFinite(at)) return undefined;
  const ago = now - at;
  // A timestamp in the future is a model error, not a fact about the fraud.
  if (ago < -HOUR_MS) return undefined;
  if (ago <= HOUR_MS) return "last-hour";
  const today = new Date(now);
  const then = new Date(at);
  const sameDay = today.getFullYear() === then.getFullYear()
    && today.getMonth() === then.getMonth()
    && today.getDate() === then.getDate();
  return sameDay ? "today" : "older";
}

/** Whether money left, when the story is clear enough to say. */
export function moneyFromAnalysis(analysis: IntakeAnalysis): MoneyAnswer | undefined {
  const amount = analysis.triage.amount;
  if (typeof amount === "number" && amount > 0) return "yes";
  // A category with no money in it at all can answer for itself. A financial
  // one with no amount cannot: the money may have moved and gone unmentioned.
  const financial = analysis.triage.applicableTracks.includes("bank-notice");
  return financial ? undefined : "no";
}

/**
 * Whether to put the emergency card in front of them straight away.
 *
 * This replaces a question, and it is deliberately not the same thing. Asking
 * "are you in danger?" of somebody who has just been defrauded gets a reflexive
 * "no" and a tap; watching for the frauds that come with a threat — a digital
 * arrest, a sextortion, a loan-app agent — puts the number in front of the
 * people who need it whether or not they would have said so. The 112 and 1930
 * buttons stay on screen for everybody either way.
 */
export function safetyFromAnalysis(analysis: IntakeAnalysis): SafetyAnswer {
  const { categoryId, subcategoryId } = analysis.triage;
  const coercive = COERCIVE.has(categoryId) || (subcategoryId ? COERCIVE_SUB.has(subcategoryId) : false);
  return coercive ? "danger" : "safe";
}

/** Whether a child is in the frame, so the 1098 route is offered. */
export function childFromAnalysis(analysis: IntakeAnalysis): ChildContext {
  const { categoryId, subcategoryId } = analysis.triage;
  if (subcategoryId && CHILD_SUB.has(subcategoryId)) return "child-other";
  if (categoryId === "women-child") return "unknown";
  return "adult-or-no-child";
}

/**
 * The draft that one box and one model call produce.
 *
 * `acceptedBoundaries` is true because the boundary note is shown on the box
 * itself rather than as a card to dismiss, and the safety stamp is now, because
 * this is the moment the emergency routes were put in front of them.
 */
export function draftFromStory(
  narrative: string,
  analysis: IntakeAnalysis,
  now = new Date(),
  /** Facts the person stated outright, which must not be asked for again. */
  said: { callerName?: string; bankName?: string } = {},
): Partial<IntakeDraft> {
  const safety = safetyFromAnalysis(analysis);
  const childContext = childFromAnalysis(analysis);
  return {
    acceptedBoundaries: true,
    narrative: narrative.trim(),
    analysis,
    analysisConfirmed: false,
    safety,
    safetyCheckedAt: now.toISOString(),
    // An acknowledgement is the person's to give; only the safe path is settled
    // here, so a flagged case still stops on the emergency card.
    emergencyAcknowledged: safety === "safe" ? false : undefined,
    childContext,
    childSafetyAcknowledged: childContext === "adult-or-no-child" ? false : undefined,
    moneyMoved: moneyFromAnalysis(analysis),
    incidentTiming: timingFromIncident(analysis.triage.incidentAt, now.getTime()),
    callerName: said.callerName ? properName(said.callerName) || undefined : undefined,
    bankName: said.bankName?.trim() || undefined,
  };
}
