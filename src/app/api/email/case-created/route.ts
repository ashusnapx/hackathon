import { emailConfigured, sendCaseCreatedEmail } from "@/lib/email/send";
import { readSmallJson, requestHasSameOrigin } from "@/lib/integrations/vaani";
import { json } from "@/lib/integrations/vaani-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

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
  const permitted = new Set(["to", "ref", "caseId", "category", "amountInr", "financial"]);
  if (Object.keys(body).some((key) => !permitted.has(key))) {
    return json({ error: "unexpected-field" }, 400);
  }
  if (typeof body.to !== "string" || !EMAIL_PATTERN.test(body.to) || body.to.length > 254) {
    return json({ error: "invalid-email" }, 400);
  }
  if (typeof body.ref !== "string" || !REF_PATTERN.test(body.ref)) {
    return json({ error: "invalid-reference" }, 400);
  }
  if (typeof body.caseId !== "string" || !UUID_PATTERN.test(body.caseId)) {
    return json({ error: "invalid-case-id" }, 400);
  }

  if (!emailConfigured()) {
    // Not an error the person should see: their case is saved either way.
    return json({ sent: false, reason: "not-configured" }, 200);
  }

  const result = await sendCaseCreatedEmail(body.to, {
    ref: body.ref,
    caseId: body.caseId,
    category: typeof body.category === "string" ? body.category.slice(0, 80) : undefined,
    amountInr: typeof body.amountInr === "number" && Number.isFinite(body.amountInr)
      ? Math.max(0, Math.round(body.amountInr))
      : undefined,
    financial: body.financial === true,
  });

  return json(result.sent ? { sent: true } : { sent: false, reason: result.reason }, 200);
}
