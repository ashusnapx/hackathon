import { currentUser } from "@/lib/auth/server";
import { CASE_KEY_PATTERN } from "@/lib/case/key";
import { claimEmailSend, releaseEmailSend } from "@/lib/db/email-sends";
import { emailConfigured, sendCaseCreatedEmail } from "@/lib/email/send";
import { readSmallJson, requestHasSameOrigin } from "@/lib/http/request";
import { json } from "@/lib/integrations/vaani-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

const CASE_CREATED_KIND = "case-created";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const REF_PATTERN = /^KVC-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Email a saved case to the person it belongs to.
 *
 * Only the reference, the case id and two coarse facts are accepted. The
 * narrative never travels by email: it is the most sensitive thing the person
 * owns, and an inbox is not where it belongs.
 */
export async function POST(req: Request) {
  if (!requestHasSameOrigin(req)) return json({ error: "same-origin-required" }, 403);

  const parsed = await readSmallJson(req, 1_024);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  if (!parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return json({ error: "invalid-json-object" }, 400);
  }

  const body = parsed.value as Record<string, unknown>;
  const permitted = new Set(["to", "ref", "caseId", "caseKey", "category", "amountInr", "financial"]);
  if (Object.keys(body).some((key) => !permitted.has(key))) {
    return json({ error: "unexpected-field" }, 400);
  }
  /*
   * Where this is sent, in order of preference.
   *
   * The signed-in account's address wins over anything in the request, and
   * that is a security property rather than a convenience: without it this
   * route will post a working case link to whatever address a caller puts in
   * the body, which is a way to have Kavach hand somebody else's case to an
   * attacker. A typed address is only honoured when nobody is signed in, which
   * is the path where the person has no account and the case lives solely in
   * their browser.
   */
  const account = await currentUser();
  const to = account?.email ?? (typeof body.to === "string" ? body.to : "");
  if (!EMAIL_PATTERN.test(to) || to.length > 254) {
    return json({ error: "invalid-email" }, 400);
  }
  if (typeof body.ref !== "string" || !REF_PATTERN.test(body.ref)) {
    return json({ error: "invalid-reference" }, 400);
  }
  if (typeof body.caseId !== "string" || !UUID_PATTERN.test(body.caseId)) {
    return json({ error: "invalid-case-id" }, 400);
  }
  // Optional, and never invented here: an email without it still tells the
  // person their reference, it just cannot open the case on a second device.
  if (body.caseKey !== undefined
    && (typeof body.caseKey !== "string" || !CASE_KEY_PATTERN.test(body.caseKey))) {
    return json({ error: "invalid-case-key" }, 400);
  }

  if (!emailConfigured()) {
    // Not an error the person should see: their case is saved either way.
    return json({ sent: false, reason: "not-configured" }, 200);
  }

  /*
   * One of these per case, ever, and the database is what decides it.
   *
   * The sender is mounted on every case screen — it has to be, because it is
   * the only place that reliably has both a case and an address — so this route
   * is asked again on every navigation between a case and its steps, from every
   * device, and from both tabs when somebody has two open. Claiming here rather
   * than trusting the caller is what turns all of that into a single email.
   */
  const claimed = await claimEmailSend(body.caseId, CASE_CREATED_KIND, to);
  if (!claimed) return json({ sent: false, reason: "already-sent" }, 200);

  const result = await sendCaseCreatedEmail(to, {
    ref: body.ref,
    caseId: body.caseId,
    caseKey: typeof body.caseKey === "string" ? body.caseKey : undefined,
    category: typeof body.category === "string" ? body.category.slice(0, 80) : undefined,
    amountInr: typeof body.amountInr === "number" && Number.isFinite(body.amountInr)
      ? Math.max(0, Math.round(body.amountInr))
      : undefined,
    financial: body.financial === true,
  });

  // A claim that did not turn into a message has to go back, or one refused
  // SMTP connection would silence this case's reference for good.
  if (!result.sent) await releaseEmailSend(body.caseId, CASE_CREATED_KIND);

  return json(result.sent ? { sent: true } : { sent: false, reason: result.reason }, 200);
}
