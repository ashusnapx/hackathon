import type { CaseFile } from "@/lib/case/types";
import { isJsonRecord } from "./request-guard";

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

/**
 * The browser normally sends a CaseFile created by our own store. API routes
 * still treat it as untrusted: a forged same-origin request must fail with 400,
 * not walk arbitrary shapes or spend provider tokens on them.
 */
export function isCaseFilePayload(value: unknown): value is CaseFile {
  if (!isJsonRecord(value)) return false;
  if (
    typeof value.id !== "string"
    || typeof value.ref !== "string"
    || typeof value.createdAt !== "string"
    || typeof value.language !== "string"
    || typeof value.rawStatement !== "string"
    || typeof value.evidenceText !== "string"
    || (value.amount !== undefined
      && (typeof value.amount !== "number" || !Number.isFinite(value.amount)))
  ) return false;

  if (
    !isJsonRecord(value.entities)
    || !isStringArray(value.entities.upiIds)
    || !isStringArray(value.entities.phones)
    || !isStringArray(value.entities.accounts)
    || !isStringArray(value.entities.refs)
    || !isStringArray(value.entities.urls)
    || !isStringArray(value.entities.emails)
    || !isStringArray(value.entities.handles)
    || !isStringArray(value.entities.apps)
  ) return false;

  if (
    !isJsonRecord(value.victim)
    || !isJsonRecord(value.bank)
    || !isJsonRecord(value.suspect)
    || !isStringArray(value.suspect.phones)
    || !isStringArray(value.suspect.upiIds)
    || !isStringArray(value.suspect.accounts)
    || !isStringArray(value.suspect.urls)
    || !isStringArray(value.suspect.handles)
    || !isJsonRecord(value.docs)
  ) return false;

  if (
    !Array.isArray(value.txns)
    || !value.txns.every(isJsonRecord)
    || !Array.isArray(value.tracks)
    || !value.tracks.every((track) => isJsonRecord(track) && typeof track.id === "string")
    || !Array.isArray(value.events)
    || !value.events.every(isJsonRecord)
    || !Array.isArray(value.files)
    || !value.files.every((file) =>
      isJsonRecord(file)
      && typeof file.name === "string"
      && typeof file.size === "number"
      && typeof file.type === "string")
  ) return false;

  if (value.triage !== null) {
    if (
      !isJsonRecord(value.triage)
      || typeof value.triage.categoryId !== "string"
      || typeof value.triage.confidence !== "number"
      || !isStringArray(value.triage.applicableTracks)
      || !["critical", "high", "moderate"].includes(String(value.triage.urgency))
    ) return false;
  }

  return value.evidence === undefined
    || (Array.isArray(value.evidence) && value.evidence.every(isJsonRecord));
}
