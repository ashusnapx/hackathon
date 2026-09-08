import { CLAIM_PATTERN, redeemClaim } from "@/lib/whatsapp/claim";
import { databaseConfigured } from "@/lib/db/supabase";
import { noStoreJson, readSmallJson, requestHasSameOrigin, statusForBodyError } from "@/lib/http/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Trade the token from a WhatsApp handoff link for the interview behind it.
 *
 * POST rather than GET, and same-origin only, so the token cannot be spent by a
 * link somebody was tricked into loading, and never appears in a request line
 * that a proxy or an access log would keep. It is single-use: the second call
 * with the same token gets the same answer as a wrong one.
 */
export async function POST(req: Request) {
  if (!requestHasSameOrigin(req)) return noStoreJson({ error: "same-origin-required" }, 403);
  if (!databaseConfigured()) return noStoreJson({ error: "storage-not-configured" }, 503);

  const parsed = await readSmallJson(req, 2_000);
  if (!parsed.ok) return noStoreJson({ error: parsed.error }, statusForBodyError(parsed.error));

  const token = (parsed.value as { token?: unknown } | null)?.token;
  if (typeof token !== "string" || !CLAIM_PATTERN.test(token)) {
    return noStoreJson({ error: "invalid-token" }, 400);
  }

  const draft = await redeemClaim(token);
  // Spent, expired and never-existed are one answer on purpose: telling them
  // apart tells somebody holding a stolen link which ones are worth retrying.
  if (!draft) return noStoreJson({ error: "claim-not-available" }, 404);

  return noStoreJson({ draft }, 200);
}
