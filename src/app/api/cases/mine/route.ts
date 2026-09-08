import { currentUser } from "@/lib/auth/server";
import { CASE_KEY_PATTERN } from "@/lib/case/key";
import { CASE_ID_PATTERN } from "@/lib/db/case-request";
import { claimCases, listOwnedCases, type OwnedCase } from "@/lib/db/case-owners";
import { databaseConfigured } from "@/lib/db/supabase";
import { noStoreJson, readSmallJson, requestHasSameOrigin, statusForBodyError } from "@/lib/http/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

/** A keyring, not a case list. Well above any real one, far below a flood. */
const MAX_CLAIMED = 100;

/** id + key, times a hundred, plus JSON overhead. */
const MAX_BODY_BYTES = 16 * 1024;

/**
 * Reconcile this device's cases with the ones on the account.
 *
 * One round trip does both halves, because they are the same operation seen
 * from two ends: the browser offers the cases it holds keys for, and gets back
 * every case the account knows about. Whichever device is ahead, both end up
 * with the same set — which is the bug this route exists to fix. The same email
 * and password showed a different number of cases on a phone and on a laptop,
 * because a case key had only ever lived in the browser that generated it.
 *
 * The account is read with `auth.getUser()`, which verifies the session against
 * Supabase rather than believing a cookie. Nothing here trusts a user id from
 * the body; there isn't one to trust.
 *
 * Signing in is not required to use Kavach and this route is the only thing
 * that changes when somebody does. A signed-out visitor gets 401 and the client
 * carries on exactly as it did before accounts existed.
 */
export async function POST(req: Request) {
  if (!requestHasSameOrigin(req)) return noStoreJson({ error: "same-origin-required" }, 403);
  if (!databaseConfigured()) return noStoreJson({ error: "storage-not-configured" }, 503);

  const user = await currentUser();
  if (!user) return noStoreJson({ error: "sign-in-required" }, 401);

  const parsed = await readSmallJson(req, MAX_BODY_BYTES);
  if (!parsed.ok) return noStoreJson({ error: parsed.error }, statusForBodyError(parsed.error));
  if (!parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return noStoreJson({ error: "invalid-json-object" }, 400);
  }

  const offered = readOfferedCases((parsed.value as Record<string, unknown>).cases);
  if (offered === null) return noStoreJson({ error: "invalid-case-credentials" }, 400);

  try {
    // Claim first, then list, so a device that has just contributed a case sees
    // it come back in the same response and never has to ask twice.
    await claimCases(user.id, offered);
    return noStoreJson({ cases: await listOwnedCases(user.id) }, 200);
  } catch {
    return noStoreJson({ error: "storage-unavailable", retryable: true }, 503);
  }
}

/**
 * What the browser is allowed to offer.
 *
 * `null` for a body that is the wrong shape, so a malformed request is refused
 * rather than silently treated as an empty offer — a device whose cases were
 * quietly dropped would look exactly like a device with no cases, which is the
 * failure this whole route is here to end.
 *
 * Individual entries are different: a single unusable pair is skipped, because
 * one corrupted local storage record must not stop the other nine cases on that
 * device from reaching the account.
 */
function readOfferedCases(value: unknown): OwnedCase[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_CLAIMED) return null;

  const seen = new Set<string>();
  const cases: OwnedCase[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const { id, key } = entry as Record<string, unknown>;
    if (typeof id !== "string" || !CASE_ID_PATTERN.test(id)) continue;
    if (typeof key !== "string" || !CASE_KEY_PATTERN.test(key)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    cases.push({ id, key });
  }
  return cases;
}
