import type { CaseFile, Entities } from "./types";
import { findCategory } from "./categories";
import type { VaaniCallFacts } from "@/lib/intake/from-vaani";

/**
 * Late arrivals from the call, folded into a case that is already open.
 *
 * The provider finishes a transcript in about a minute but can take several
 * more to return its structured fields, and the case is opened long before
 * that — deliberately, because a person who has just hung up should not be left
 * watching a spinner. This is how the rest catches up: whatever the agent
 * captured is offered against the case as it now stands.
 *
 * Nothing already in the case is touched. By the time these fields arrive the
 * person may have corrected an amount or typed their own name, and a machine's
 * later reading of a stressful conversation does not get to overrule that. Only
 * empty fields are filled, and lists only ever gain values.
 */
export interface CallBackfill {
  patch: Partial<CaseFile>;
  /** What would actually change, so the offer can be declined knowingly. */
  added: string[];
}

const clean = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed || undefined;
};

/** New values only, appended in place. Returns null when nothing is new. */
function union(existing: string[], incoming: string[]): string[] | null {
  const seen = new Set(existing.map((value) => value.trim().toLowerCase()));
  const extra: string[] = [];
  for (const value of incoming) {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    extra.push(value.trim());
  }
  return extra.length ? [...existing, ...extra] : null;
}

export function caseUpdatesFromCall(caseFile: CaseFile, facts: VaaniCallFacts): CallBackfill {
  const patch: Partial<CaseFile> = {};
  const added: string[] = [];

  const victim: CaseFile["victim"] = {};
  if (!clean(caseFile.victim.name) && facts.callerName) {
    victim.name = facts.callerName;
    added.push("Name");
  }
  if (!clean(caseFile.victim.state) && facts.state) {
    victim.state = facts.state;
    added.push("State");
  }
  if (!clean(caseFile.victim.district) && facts.district) {
    victim.district = facts.district;
    added.push("District");
  }
  if (Object.keys(victim).length) patch.victim = { ...caseFile.victim, ...victim };

  if (!clean(caseFile.bank.name) && facts.bankName) {
    patch.bank = { ...caseFile.bank, name: facts.bankName };
    added.push("Bank");
  }

  if (caseFile.amount === undefined && facts.triage.amount !== undefined) {
    patch.amount = facts.triage.amount;
    added.push("Amount");
  }

  if (!caseFile.incidentAt && facts.triage.incidentAt) {
    patch.incidentAt = facts.triage.incidentAt;
    added.push("When it happened");
  }

  if (!clean(caseFile.evidenceText) && facts.evidenceText) {
    patch.evidenceText = facts.evidenceText;
    added.push("Evidence held");
  }

  const entities: Partial<Entities> = {};
  const entityLabels: Record<keyof Entities, string> = {
    upiIds: "UPI ID", phones: "Phone number", accounts: "Account number", refs: "Reference number",
    urls: "Link", emails: "Email address", handles: "Handle", apps: "App or platform",
  };
  for (const key of Object.keys(entityLabels) as (keyof Entities)[]) {
    const merged = union(caseFile.entities[key], facts.entities[key]);
    if (!merged) continue;
    entities[key] = merged;
    added.push(entityLabels[key]);
  }
  if (Object.keys(entities).length) patch.entities = { ...caseFile.entities, ...entities };

  // The suspect block is what the complaint documents read from, so an
  // identifier that reaches the case has to reach both.
  const suspect = { ...caseFile.suspect };
  let suspectChanged = false;
  for (const key of ["phones", "upiIds", "urls"] as const) {
    const merged = union(caseFile.suspect[key], facts.entities[key]);
    if (!merged) continue;
    suspect[key] = merged;
    suspectChanged = true;
  }
  if (suspectChanged) patch.suspect = suspect;

  // A category is only offered when the case has none: re-routing a case the
  // person has already been working through would move their deadlines.
  if (!caseFile.triage && facts.triage.categoryId) {
    patch.triage = {
      categoryId: facts.triage.categoryId,
      subcategoryId: facts.triage.subcategoryId,
      confidence: facts.triage.confidence ?? 0.6,
      amount: facts.triage.amount,
      incidentAt: facts.triage.incidentAt,
      englishNarrative: facts.triage.englishNarrative,
      applicableTracks: facts.triage.applicableTracks
        ?? findCategory(facts.triage.categoryId)?.tracks
        ?? [],
      urgency: facts.triage.urgency ?? "moderate",
    };
    added.push("Fraud type");
  }

  return { patch, added };
}
