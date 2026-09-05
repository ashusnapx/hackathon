import call from "./call.json";
import { createDefaultEvidence } from "@/lib/case/evidence";
import { getCase, newCase, saveCase } from "@/lib/case/store";
import { EMPTY_ENTITIES, type CaseFile } from "@/lib/case/types";
import { callAnalysis } from "@/lib/intake/call-to-case";
import { mapVaaniCall } from "@/lib/intake/from-vaani";
import { DEMO_CASE_ID } from "./id";

/**
 * The case that the call on the home page produced.
 *
 * A case file lives in the browser that made it, so a link to one is worth
 * nothing to anybody else. This is the shareable version: it is built here,
 * from the call committed to this repository, by the same functions a real call
 * runs through — `mapVaaniCall` reads the provider's fields, `callAnalysis`
 * turns them into a triage. Nothing is hand-written to make the demonstration
 * look better, so what a visitor reads is what the pipeline actually produces.
 *
 * It is seeded into the visitor's own storage on first open, which means every
 * tab, document and deadline behaves exactly as it would for their own case —
 * and they can edit it, because it is theirs now.
 */
export { DEMO_CASE_ID, DEMO_CASE_PATH } from "./id";

/** Fixed, so the sample reads the same on every device and every reload. */
const AT = `${call.fetchedAt}T00:00:00.000Z`;

/**
 * The caller's own words, and only those.
 *
 * The same rule as a real case: the agent's questions are not the victim's
 * statement, and a complaint must never quote them as if they were.
 */
function victimAccount(): string {
  return call.turns
    .filter((turn) => !turn.agent)
    .map((turn) => turn.text.trim())
    .filter(Boolean)
    .join(" ");
}

export function buildDemoCase(): CaseFile {
  const facts = mapVaaniCall(call.extracted as Record<string, unknown>);
  const analysis = callAnalysis(facts);

  // Held because the caller said so on the recording: "I have the screenshot"
  // and "Contacted me through email". Nothing else is marked.
  const held = new Set(["txn_screenshot", "email_correspondence"]);
  const evidence = createDefaultEvidence(AT).map((item) =>
    held.has(item.id) ? { ...item, status: "added" as const, updatedAt: AT } : item,
  );

  return newCase({
    id: DEMO_CASE_ID,
    ref: "KVC-DEMO-CALL",
    createdAt: AT,
    language: "en",
    rawStatement: victimAccount(),
    triage: analysis?.triage ?? null,
    entities: analysis?.entities ?? { ...EMPTY_ENTITIES },
    amount: facts.triage.amount,
    incidentAt: facts.triage.incidentAt,
    txns: facts.triage.amount
      ? [{ amount: facts.triage.amount, ref: facts.entities.refs[0], at: facts.triage.incidentAt }]
      : [],
    victim: { name: facts.callerName, state: facts.state, district: facts.district },
    ...(facts.bankName ? { bank: { name: facts.bankName } } : {}),
    suspect: {
      phones: facts.entities.phones,
      upiIds: facts.entities.upiIds,
      accounts: facts.entities.accounts,
      urls: facts.entities.urls,
      handles: facts.entities.handles,
    },
    evidenceText: facts.evidenceText ?? "",
    files: [],
    evidence,
    voiceCall: { demoCallId: call.callId, endedAt: AT },
    events: [
      { at: AT, kind: "opened", label: "Case file opened" },
      { at: AT, kind: "triaged", label: "Opened from a voice call · nothing confirmed yet" },
    ],
  });
}

/**
 * Put the sample in this browser, once.
 *
 * A visitor who has already opened it — and perhaps corrected something in it —
 * keeps their copy. Storage can be unavailable or full, and that is not worth
 * an error page: the case screen already knows how to say it cannot find a case.
 */
export function ensureDemoCase(): void {
  if (typeof window === "undefined") return;
  try {
    if (getCase(DEMO_CASE_ID)) return;
    saveCase(buildDemoCase());
  } catch {
    // Private mode, quota, or a disabled store. Nothing else to do here.
  }
}
