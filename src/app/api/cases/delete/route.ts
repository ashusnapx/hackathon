import { caseKeyHash } from "@/lib/case/key";
import { readCaseCredentials } from "@/lib/db/case-request";
import { deleteCaseRow } from "@/lib/db/cases";
import { databaseConfigured } from "@/lib/db/supabase";
import { noStoreJson, readSmallJson, requestHasSameOrigin, statusForBodyError } from "@/lib/http/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

/**
 * Remove the stored copy, for good.
 *
 * Deleting a case on the device has to mean deleting it everywhere, or the
 * promise on the delete button is a lie. The row is removed rather than
 * flagged, so there is nothing left to restore or to leak later.
 */
export async function POST(req: Request) {
  if (!requestHasSameOrigin(req)) return noStoreJson({ error: "same-origin-required" }, 403);
  if (!databaseConfigured()) return noStoreJson({ error: "storage-not-configured" }, 503);

  const parsed = await readSmallJson(req, 1_024);
  if (!parsed.ok) return noStoreJson({ error: parsed.error }, statusForBodyError(parsed.error));
  if (!parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return noStoreJson({ error: "invalid-json-object" }, 400);
  }

  const credentials = readCaseCredentials(parsed.value as Record<string, unknown>);
  if (!credentials) return noStoreJson({ error: "invalid-case-credentials" }, 400);

  try {
    const removed = await deleteCaseRow(credentials.id, await caseKeyHash(credentials.key));
    // Already gone is the outcome the caller wanted, so it is not an error.
    return noStoreJson({ removed }, 200);
  } catch {
    return noStoreJson({ error: "storage-unavailable", retryable: true }, 503);
  }
}
