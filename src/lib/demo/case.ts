import call from "./call.json";
import { ruleDocs } from "@/lib/ai/fallback";
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
 * turns them into a triage, `ruleDocs` writes the drafts. Nothing is
 * hand-written to make the demonstration look better, so what a visitor reads
 * is what the pipeline actually produces.
 *
 * It is seeded into the visitor's own storage on first open, which means every
 * tab, document and deadline behaves exactly as it would for their own case —
 * and they can edit it, because it is theirs now.
 *
 * Two things are deliberately not frozen with the recording:
 *
 *   · **The clock.** The call is fixed; the calendar is not. A sample whose
 *     deadlines all lapsed months ago demonstrates nothing — every track reads
 *     "missed" and the reader learns only that the page can print a red chip.
 *     So the incident is placed where the caller actually put it, two days
 *     before the reader opens it: "day before yesterday", "2 days back", in
 *     their own words on the recording. The clocks then run for real.
 *   · **The drafts.** They are generated here by the deterministic writer
 *     rather than fetched, so the sample opens with its documents already
 *     written on a cold cache, with no API key, and without a signed-out
 *     reader hitting an endpoint that will refuse them.
 *
 * What stays fixed is everything the call established: the words, the amount,
 * the identifiers, and which evidence the caller said they hold.
 */
export { DEMO_CASE_ID, DEMO_CASE_PATH } from "./id";

/**
 * How long before the visit the fraud happened.
 *
 * Not a chosen number: it is what the caller says twice on the recording.
 */
const DAYS_SINCE_INCIDENT = 2;

/** Rebuild a sample older than this, so its clocks are never stale. */
const STALE_AFTER_MS = 6 * 60 * 60 * 1000;

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

function daysBefore(at: Date, days: number): string {
  const date = new Date(at.getTime());
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

/**
 * The one substitution made to the agent's own prose.
 *
 * The provider wrote its chronology against the day the call was recorded, and
 * that date is printed inside the narrative that goes on to the NCRP and FIR
 * drafts. Moving the incident without moving this leaves the sample telling a
 * reader two different dates for the same transaction — on a police complaint.
 *
 * So exactly one token is replaced: the date the extraction itself recorded, as
 * it appears in the text. Nothing else about the sentence is touched, and if
 * the provider ever stops emitting that date the narrative passes through
 * unchanged rather than being quietly rewritten by a looser pattern.
 */
function redate(narrative: string | undefined, incidentAt: string): string | undefined {
  const recorded = typeof call.extracted.incident_timing === "string"
    ? call.extracted.incident_timing
    : null;
  if (!narrative || !recorded) return narrative;
  return narrative.split(recorded).join(incidentAt.slice(0, 10));
}

export function buildDemoCase(now: Date = new Date()): CaseFile {
  const at = now.toISOString();
  const incidentAt = daysBefore(now, DAYS_SINCE_INCIDENT);

  const facts = mapVaaniCall(call.extracted as Record<string, unknown>);
  const analysis = callAnalysis(facts);

  // Held because the caller said so on the recording: "I have the screenshot"
  // and "Contacted me through email". Nothing else is marked.
  const held = new Set(["txn_screenshot", "email_correspondence"]);
  const evidence = createDefaultEvidence(at).map((item) =>
    held.has(item.id) ? { ...item, status: "added" as const, updatedAt: at } : item,
  );

  const caseFile = newCase({
    id: DEMO_CASE_ID,
    ref: "KVC-DEMO-CALL",
    createdAt: at,
    language: "en",
    rawStatement: victimAccount(),
    // The provider dated the incident against the day it was recorded. The
    // reader's calendar is a different one, so the triage carries the same
    // interval rather than the same date.
    triage: analysis?.triage
      ? {
        ...analysis.triage,
        incidentAt,
        englishNarrative: redate(analysis.triage.englishNarrative, incidentAt),
      }
      : null,
    entities: analysis?.entities ?? { ...EMPTY_ENTITIES },
    amount: facts.triage.amount,
    incidentAt,
    txns: facts.triage.amount
      ? [{ amount: facts.triage.amount, ref: facts.entities.refs[0], at: incidentAt }]
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
    voiceCall: { demoCallId: call.callId, endedAt: at },
    events: [
      { at, kind: "opened", label: "Case file opened" },
      { at, kind: "triaged", label: "Opened from a voice call · nothing confirmed yet" },
    ],
  });

  // Written from the finished case, so the drafts quote the same facts the
  // Overview tab shows rather than an earlier version of them.
  return {
    ...caseFile,
    docs: { ...ruleDocs(caseFile), generatedAt: at, generatedBy: "rules" },
    events: [
      ...caseFile.events,
      { at, kind: "docs", label: "Drafts prepared · unfiled" },
    ],
  };
}

/**
 * Has the reader made this case their own?
 *
 * A sample that has been edited is no longer a sample, and rebuilding it to
 * refresh a countdown would throw away somebody's work. Anything beyond the
 * three events it is seeded with — a ticked track, a filled blank, an added
 * file — counts as touched, and touched cases are left exactly as they are.
 */
function isUntouched(caseFile: CaseFile): boolean {
  return caseFile.events.length <= 3
    && caseFile.tracks.length === 0
    && !caseFile.files.length
    && !caseFile.fills;
}

function isStale(caseFile: CaseFile, now: Date): boolean {
  const created = new Date(caseFile.createdAt).getTime();
  return !Number.isFinite(created) || now.getTime() - created > STALE_AFTER_MS;
}

/**
 * Put the sample in this browser, and keep its clocks honest.
 *
 * A visitor who has already opened it — and perhaps corrected something in it —
 * keeps their copy. An untouched copy left over from an earlier visit is
 * rebuilt, because its whole job is to show deadlines that are running and it
 * cannot do that with last week's dates in it.
 *
 * Storage can be unavailable or full, and that is not worth an error page: the
 * case screen already knows how to say it cannot find a case.
 */
export function ensureDemoCase(now: Date = new Date()): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getCase(DEMO_CASE_ID);
    if (existing && !(isUntouched(existing) && isStale(existing, now))) return;
    saveCase(buildDemoCase(now));
  } catch {
    // Private mode, quota, or a disabled store. Nothing else to do here.
  }
}
