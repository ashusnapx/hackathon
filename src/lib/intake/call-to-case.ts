import { EMPTY_ENTITIES, type Entities, type Triage } from "@/lib/case/types";
import type { VaaniCallFacts } from "./from-vaani";
import type { IntakeAnalysis, IntakeDraft } from "./interview";

/**
 * What happens between hanging up and the case page opening.
 *
 * A person who has just described being defrauded, out loud, to a stranger has
 * already done the hard part. Asking them to then press "fetch transcript",
 * read it back, press "use this", and answer the same questions again in a chat
 * is not a review step — it is a second interview, and it is where people stop.
 *
 * So the call itself is the interview. The moment it ends the transcript is
 * collected, the provider's own extraction is used as-is, a model is asked only
 * for what Vaani could not supply, and the case opens. The transcript is not
 * hidden by this: it is on the case page, under Call, next to the recording,
 * where it can be read without blocking anything.
 */

/**
 * How long to keep asking whether the call has been written up.
 *
 * The provider says "not ready" with a Retry-After until the call has been
 * written up, which took about a minute for a real four-minute conversation.
 * The budget is generous because there is nothing else for the caller to do
 * and the alternative is asking them to press a button; past it, the panel
 * stops waiting and hands over those controls, because a spinner that never
 * resolves is worse than a button.
 */
export const CALL_POLL_BUDGET_MS = 120_000;

const POLL_BACKOFF_MS = [2_000, 3_000, 4_000, 6_000, 8_000, 10_000, 12_000, 15_000];

/** Backs off, but never ignores a Retry-After the provider actually sent. */
export function callPollDelayMs(attempt: number, retryAfterSeconds?: number | null): number {
  const index = Math.min(Math.max(Math.trunc(attempt), 0), POLL_BACKOFF_MS.length - 1);
  const base = POLL_BACKOFF_MS[index];
  const asked = Number(retryAfterSeconds);
  if (!Number.isFinite(asked) || asked <= 0) return base;
  return Math.min(Math.max(base, asked * 1_000), 20_000);
}

const URGENCY_RANK: Record<Triage["urgency"], number> = { moderate: 0, high: 1, critical: 2 };

/** Two readings of the same call: keep the more urgent. Never quieten a case. */
function moreUrgent(a: Triage["urgency"] | undefined, b: Triage["urgency"] | undefined): Triage["urgency"] {
  if (!a) return b ?? "moderate";
  if (!b) return a;
  return URGENCY_RANK[a] >= URGENCY_RANK[b] ? a : b;
}

/** Union of two extractions, in call-first order, without repeating a value. */
function mergeEntities(fromCall: Entities, fromModel: Entities): Entities {
  const merged = { ...EMPTY_ENTITIES };
  for (const key of Object.keys(EMPTY_ENTITIES) as (keyof Entities)[]) {
    const seen = new Set<string>();
    merged[key] = [...fromCall[key], ...fromModel[key]].filter((value) => {
      const normalised = value.trim().toLowerCase();
      if (!normalised || seen.has(normalised)) return false;
      seen.add(normalised);
      return true;
    });
  }
  return merged;
}

/**
 * The hybrid reading: Vaani's concrete answers win, the model fills the gaps.
 *
 * An amount, a UPI id or a reference number that the caller said aloud and the
 * agent captured as a field is better evidence than the same number re-derived
 * from a transcript. So the call's values are never overwritten by the model's —
 * the model only supplies what was missing, and only when it was called at all.
 */
export function callAnalysis(facts: VaaniCallFacts, model?: IntakeAnalysis | null): IntakeAnalysis | null {
  const call = facts.triage;

  if (!model) {
    if (!call.categoryId) return null;
    return {
      triage: {
        categoryId: call.categoryId,
        subcategoryId: call.subcategoryId,
        confidence: call.confidence ?? 0.6,
        amount: call.amount,
        incidentAt: call.incidentAt,
        englishNarrative: call.englishNarrative,
        applicableTracks: call.applicableTracks ?? [],
        urgency: call.urgency ?? "moderate",
      },
      entities: facts.entities,
      source: "vaani",
    };
  }

  const triage: Triage = {
    ...model.triage,
    ...(call.categoryId
      ? {
        categoryId: call.categoryId,
        subcategoryId: call.subcategoryId,
        confidence: call.confidence ?? model.triage.confidence,
        applicableTracks: call.applicableTracks?.length
          ? call.applicableTracks
          : model.triage.applicableTracks,
      }
      : {}),
    ...(call.amount !== undefined ? { amount: call.amount } : {}),
    ...(call.incidentAt ? { incidentAt: call.incidentAt } : {}),
    ...(call.englishNarrative ? { englishNarrative: call.englishNarrative } : {}),
    urgency: moreUrgent(call.urgency, model.triage.urgency),
  };

  return {
    triage,
    entities: mergeEntities(facts.entities, model.entities),
    // Honest attribution for the line the person reads under their own facts:
    // the call is only credited when the call actually supplied something.
    source: facts.filledFromCall > 0 ? "vaani" : model.source,
  };
}

/**
 * Fold a finished call into the interview draft the case is built from.
 *
 * Nothing is marked confirmed. The person lands on a case page whose facts are
 * all editable, which is the same standing they would have had after the old
 * review screen — reached without the extra tap.
 */
export function draftFromCall(
  draft: IntakeDraft,
  input: { facts: VaaniCallFacts; narrative: string; analysis: IntakeAnalysis },
): IntakeDraft {
  const { facts, analysis } = input;
  const spoken = input.narrative.replace(/\s+/g, " ").trim();
  const existing = draft.narrative.trim();
  const narrative = !spoken || existing.includes(spoken)
    ? existing
    : [existing, spoken].filter(Boolean).join(" ");

  return {
    ...draft,
    narrative,
    moneyMoved: facts.moneyMoved ?? draft.moneyMoved,
    transactionInitiation: facts.transactionInitiation ?? draft.transactionInitiation,
    callerName: facts.callerName ?? draft.callerName,
    bankName: facts.bankName ?? draft.bankName,
    state: facts.state ?? draft.state,
    district: facts.district ?? draft.district,
    evidenceNote: facts.evidenceText ?? draft.evidenceNote,
    analysis,
    analysisConfirmed: false,
  };
}
