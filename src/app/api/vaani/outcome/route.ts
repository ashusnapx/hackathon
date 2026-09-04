import {
  getVaaniCallOutcome,
  getVaaniWebConfiguration,
  readSmallJson,
  readVaaniTranscriptToken,
  requestHasSameOrigin,
  VaaniProviderError,
} from "@/lib/integrations/vaani";
import { json, readBrowserSessionId } from "@/lib/integrations/vaani-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/**
 * Post-call structured output: the disposition, the extracted fields and the
 * summary the agent produced.
 *
 * Everything here is returned as a draft. The extraction is a model's reading of
 * a stressful conversation, so it is offered for the person to correct, never
 * written into the case as fact.
 */
export async function POST(req: Request) {
  if (!requestHasSameOrigin(req)) return json({ error: "same-origin-required" }, 403);
  if (!getVaaniWebConfiguration().ready) return json({ error: "live-voice-unavailable" }, 503);

  const parsed = await readSmallJson(req, 512);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  if (!parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return json({ error: "invalid-json-object" }, 400);
  }
  const body = parsed.value as Record<string, unknown>;
  if (Object.keys(body).some((key) => key !== "token")) return json({ error: "unexpected-field" }, 400);
  if (typeof body.token !== "string" || !TOKEN_PATTERN.test(body.token)) {
    return json({ error: "invalid-transcript-capability" }, 400);
  }

  const browserSessionId = readBrowserSessionId(req);
  const callId = browserSessionId && readVaaniTranscriptToken(body.token, browserSessionId);
  if (!callId) return json({ error: "invalid-or-expired-transcript-capability", retryable: false }, 401);

  try {
    const outcome = await getVaaniCallOutcome(callId);
    return json({
      state: "draft",
      disposition: outcome.disposition,
      extracted: outcome.extracted,
      summary: outcome.summary,
      transcriptAvailable: outcome.transcriptAvailable,
      note: "Draft only. Nothing here is a confirmed case fact until you review it.",
    }, 200);
  } catch (error) {
    const kind = error instanceof VaaniProviderError ? error.kind : "provider-unavailable";
    if (kind === "transcript-not-ready") {
      return json({ error: "outcome-not-ready", retryable: true }, 425, { "Retry-After": "10" });
    }
    return json({ error: "outcome-unavailable", providerFailure: kind, retryable: kind === "provider-unavailable" }, 502);
  }
}
