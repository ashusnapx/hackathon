import type { CaseFile, TrackId } from "./types";

export const DOCUMENT_KEYS = [
  "ncrp",
  "script",
  "bank",
  "fir",
  "chakshu",
  "mrm",
  "ombudsman",
] as const;

export type DocumentKey = (typeof DOCUMENT_KEYS)[number];

export interface ParsedDraftResponse {
  docs: Partial<Record<DocumentKey, string>>;
  source: "openai" | "rules";
}

/** Inputs sent to drafting, excluding drafts and audit events produced later. */
export function documentInputFingerprint(c: CaseFile): string {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(c).filter(([key]) => key !== "docs" && key !== "events"),
    ),
  );
}

/** Treat the API response as untrusted before putting its text in a case file. */
export function parseDraftResponse(
  value: unknown,
  required: readonly DocumentKey[],
): ParsedDraftResponse | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (candidate.source !== "openai" && candidate.source !== "rules") return null;
  if (!candidate.docs || typeof candidate.docs !== "object") return null;
  const rawDocs = candidate.docs as Record<string, unknown>;
  const docs: Partial<Record<DocumentKey, string>> = {};
  for (const key of required) {
    const body = rawDocs[key];
    if (typeof body !== "string" || !body.trim()) return null;
    docs[key] = body;
  }
  return { docs, source: candidate.source };
}

const DOCUMENT_TRACK: Record<DocumentKey, TrackId> = {
  ncrp: "ncrp",
  script: "helpline",
  bank: "bank-notice",
  fir: "fir",
  chakshu: "chakshu",
  mrm: "mrm",
  ombudsman: "ombudsman",
};

/**
 * Keep the document workbench proportional to the confirmed route. A
 * non-financial case must not receive a 1930 script, bank dispute, restoration
 * worksheet or Ombudsman complaint merely because those templates exist.
 */
export function applicableDocumentKeys(c: CaseFile): DocumentKey[] {
  const tracks = c.triage?.applicableTracks;
  const fallbackTracks = new Set<TrackId>([
    "ncrp",
    "fir",
    "legal-aid",
    ...((c.amount ?? 0) > 0
      ? (["helpline", "bank-notice", "mrm", "ombudsman"] as TrackId[])
      : []),
  ]);
  const allowed = new Set<TrackId>(tracks?.length ? tracks : fallbackTracks);

  return DOCUMENT_KEYS.filter((key) => {
    if (!allowed.has(DOCUMENT_TRACK[key])) return false;
    // Chakshu is for a suspected fraud communication. Do not manufacture a
    // blank phone-report sheet for cases with no recorded contact number.
    if (key === "chakshu") {
      return c.suspect.phones.length > 0 || c.entities.phones.length > 0;
    }
    return true;
  });
}

export function pickApplicableDocuments<T extends Partial<Record<DocumentKey, string>>>(
  c: CaseFile,
  documents: T,
): Partial<Record<DocumentKey, string>> {
  return Object.fromEntries(
    applicableDocumentKeys(c)
      .filter((key) => typeof documents[key] === "string" && Boolean(documents[key]?.trim()))
      .map((key) => [key, documents[key]]),
  );
}
