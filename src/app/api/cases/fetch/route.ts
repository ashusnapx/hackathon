import { caseKeyHash } from "@/lib/case/key";
import { readCaseCredentials } from "@/lib/db/case-request";
import { readCaseRow } from "@/lib/db/cases";
import { databaseConfigured } from "@/lib/db/supabase";
import { noStoreJson, readSmallJson, requestHasSameOrigin, statusForBodyError } from "@/lib/http/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

/**
 * Open a case on a device that has never seen it.
 *
 * This is the whole point of storing cases at all: the link in someone's email
 * has to work on the phone they read it on. POST rather than GET so the key is
 * in a body and not in a URL that a proxy, a log or a history list would keep.
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
    const stored = await readCaseRow(credentials.id, await caseKeyHash(credentials.key));
    // One answer for "no such case" and "not your case": the difference would
    // tell a stranger which case references exist.
    if (!stored) return noStoreJson({ error: "case-not-found" }, 404);
    return noStoreJson({ case: stored.data, revision: stored.revision, updatedAt: stored.updatedAt }, 200);
  } catch {
    return noStoreJson({ error: "storage-unavailable", retryable: true }, 503);
  }
}
