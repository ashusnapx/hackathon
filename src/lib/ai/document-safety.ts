import type { DocumentKey } from "@/lib/case/documents";
import type { CaseFile } from "@/lib/case/types";

type Drafts = Partial<Record<DocumentKey, string>>;

const DENIES_INITIATION = [
  /\bI\s+(?:did\s+not|never)\s+(?:initiate|authori[sz]e|approve|make|send)\b/i,
  /\b(?:payment|transaction|transfer)\s+(?:was\s+)?not\s+(?:initiated|authori[sz]ed|approved|made|sent)\s+by\s+me\b/i,
  /\bwithout\s+my\s+(?:knowledge|consent|authori[sz]ation|approval)\b/i,
];

const ASSERTS_INITIATION = [
  /\bI\s+(?:personally\s+)?(?:initiated|authori[sz]ed|approved|made|sent)\s+(?:the|this|a)?\s*(?:payment|transaction|transfer)\b/i,
  /\b(?:payment|transaction|transfer)\s+(?:was\s+)?(?:initiated|authori[sz]ed|approved|made|sent)\s+by\s+me\b/i,
];

/**
 * Reject a model bundle when it turns the citizen's verified initiation answer
 * into the opposite first-person assertion. The rules fallback then supplies
 * explicit, answer-backed wording instead of trying to patch legal prose.
 */
export function modelDraftsContradictPaymentAnswer(c: CaseFile, drafts: Drafts): boolean {
  const initiation = c.legal?.rbi?.input.initiation;
  if (!initiation) return false;
  const text = Object.values(drafts).filter(Boolean).join("\n");
  const denies = DENIES_INITIATION.some((pattern) => pattern.test(text));
  const asserts = ASSERTS_INITIATION.some((pattern) => pattern.test(text));

  if (initiation === "victim") return denies;
  if (initiation === "not-victim") return asserts;
  return denies || asserts;
}
