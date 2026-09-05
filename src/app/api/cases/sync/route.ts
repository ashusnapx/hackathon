import { caseKeyHash } from "@/lib/case/key";
import {
  MAX_CASE_BYTES,
  readCaseCredentials,
  readCaseDocument,
} from "@/lib/db/case-request";
import { writeCaseRow } from "@/lib/db/cases";
import { databaseConfigured } from "@/lib/db/supabase";
import { noStoreJson, readSmallJson, requestHasSameOrigin, statusForBodyError } from "@/lib/http/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

/**
 * Save a case where its owner can reach it again.
 *
 * The browser is still the place the case is edited; this is the copy that
 * survives a lost phone, a cleared cache, or opening the emailed link on a
 * laptop. It is written on the caller's behalf only if they present the case
 * key, and the key is turned into a hash here — the database is never sent one.
 */
export async function POST(req: Request) {
  if (!requestHasSameOrigin(req)) return noStoreJson({ error: "same-origin-required" }, 403);
  if (!databaseConfigured()) return noStoreJson({ error: "storage-not-configured" }, 503);

  const parsed = await readSmallJson(req, MAX_CASE_BYTES);
  if (!parsed.ok) return noStoreJson({ error: parsed.error }, statusForBodyError(parsed.error));
  if (!parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return noStoreJson({ error: "invalid-json-object" }, 400);
  }

  const body = parsed.value as Record<string, unknown>;
  const credentials = readCaseCredentials(body);
  if (!credentials) return noStoreJson({ error: "invalid-case-credentials" }, 400);

  const document = readCaseDocument(body, credentials.id);
  if (!document) return noStoreJson({ error: "invalid-case-document" }, 400);

  const result = await writeCaseRow({
    id: credentials.id,
    keyHash: await caseKeyHash(credentials.key),
    ref: document.ref,
    data: document.data,
  });

  if (!result.ok) {
    // A mismatch is someone else's case, which is indistinguishable from a
    // typo in a link. Neither gets told which one it was.
    return result.reason === "key-mismatch"
      ? noStoreJson({ error: "case-key-rejected" }, 403)
      : noStoreJson({ error: "storage-unavailable", retryable: true }, 503);
  }
  return noStoreJson({ revision: result.revision }, 200);
}
