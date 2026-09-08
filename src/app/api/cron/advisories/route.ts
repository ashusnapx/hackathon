import { timingSafeEqual } from "node:crypto";

import { refreshAdvisories } from "@/lib/check/refresh";
import { writeAdvisories } from "@/lib/db/advisories";
import { databaseConfigured } from "@/lib/db/supabase";
import { noStoreJson } from "@/lib/http/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Four sources fetched and read by a model. Generous, and bounded. */
export const maxDuration = 300;

/**
 * Refresh the Check page's advisory board. Scheduled, not public.
 *
 * Scammers change their story faster than this app ships, so the board that
 * warns people about it cannot be a constant in the bundle. This runs nightly
 * (see `vercel.json`), reads the four official sources, and replaces the live
 * set with what they currently say.
 *
 * It is GET because that is what a Vercel cron sends, which makes the shared
 * secret load-bearing: without it, an unauthenticated GET would let anybody on
 * the internet spend this deployment's model budget at whatever rate they like.
 * The comparison is constant-time, and a deployment with no secret configured
 * refuses every request rather than defaulting open.
 *
 * The refresh never empties the board. A pass that reads nothing usable leaves
 * the previous set in place and reports it, because a blank warning board on
 * this page is worse than a week-old one — and the page labels its own age.
 */
export async function GET(req: Request) {
  if (!authorised(req)) return noStoreJson({ error: "unauthorised" }, 401);
  if (!databaseConfigured()) return noStoreJson({ error: "storage-not-configured" }, 503);

  try {
    const result = await refreshAdvisories();

    if (!result.advisories.length) {
      // Every source down, or none carrying a dated advisory tonight. The board
      // keeps what it has; this is a normal outcome, not a failure to page over.
      return noStoreJson(
        { refreshed: 0, read: result.read, skipped: result.skipped, kept: "previous" },
        200,
      );
    }

    const written = await writeAdvisories(result.advisories);
    return noStoreJson({ refreshed: written, read: result.read, skipped: result.skipped }, 200);
  } catch {
    return noStoreJson({ error: "refresh-failed", retryable: true }, 503);
  }
}

/**
 * Vercel sends `Authorization: Bearer $CRON_SECRET`.
 *
 * No secret configured means no caller can be distinguished from an attacker,
 * so the endpoint stays shut. That is the right default for something whose
 * only failure mode when left open is a stranger draining the model budget.
 */
function authorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const offered = req.headers.get("authorization")?.trim() ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(offered);
  const b = Buffer.from(expected);
  // `timingSafeEqual` throws on a length mismatch rather than returning false.
  return a.length === b.length && timingSafeEqual(a, b);
}
