import { NextResponse } from "next/server";
import {
  consumeVaaniWebSessionBudget,
  getVaaniRecordingState,
  getVaaniWebConfiguration,
  issueVaaniTranscriptToken,
  startVaaniBrowserCall,
  readSmallJson,
  requestHasSameOrigin,
  VaaniProviderError,
} from "@/lib/integrations/vaani";
import { clientIp, getOrCreateBrowserSession, jsonWithSession, json } from "@/lib/integrations/vaani-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const SUPPORTED_LANGUAGES = new Set([
  "en", "hi", "bn", "mr", "te", "ta", "gu", "ur", "kn", "or", "ml", "pa",
  "as", "mai", "sat", "ks", "ne", "sd", "doi", "kok", "mni", "brx", "sa",
]);
const CASE_REFERENCE_PATTERN = /^KVC-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

/**
 * Open a browser voice session with the reviewed agent.
 *
 * Nothing is dialled, so there is no test-number allowlist here — but the
 * consent gates are the same ones the telephony route enforces, and recording
 * consent is required unless an operator has verified that recording is off.
 */
export async function POST(req: Request) {
  if (!requestHasSameOrigin(req)) return json({ error: "same-origin-required" }, 403);

  const config = getVaaniWebConfiguration();
  if (!config.ready) {
    return json({ error: "live-voice-unavailable", simulationAvailable: true, retryable: false }, 503);
  }

  const parsed = await readSmallJson(req, 1_024);
  if (!parsed.ok) {
    const status = parsed.error === "unsupported-media-type" ? 415
      : parsed.error === "body-too-large" ? 413 : 400;
    return json({ error: parsed.error }, status);
  }
  if (!parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return json({ error: "invalid-json-object" }, 400);
  }

  const body = parsed.value as Record<string, unknown>;
  const permitted = new Set([
    "language", "caseReference", "safeToSpeak", "transcriptionConsent", "recordingConsent",
  ]);
  if (Object.keys(body).some((key) => !permitted.has(key))) {
    return json({ error: "unexpected-field" }, 400);
  }
  if (typeof body.language !== "string" || !SUPPORTED_LANGUAGES.has(body.language)) {
    return json({ error: "unsupported-language" }, 400);
  }
  if (body.caseReference !== undefined
    && (typeof body.caseReference !== "string" || !CASE_REFERENCE_PATTERN.test(body.caseReference))) {
    return json({ error: "invalid-case-reference" }, 400);
  }
  if (body.safeToSpeak !== true) return json({ error: "safe-to-speak-required" }, 400);
  if (body.transcriptionConsent !== true) return json({ error: "transcription-consent-required" }, 400);

  // Recording consent is only dispensable where an operator has verified the
  // provider is not recording. "unknown" is treated as recording.
  const recordingState = getVaaniRecordingState();
  const consentedFields = ["voice_processing", "transcription"];
  if (recordingState === "disabled") {
    if (body.recordingConsent === true) consentedFields.push("recording");
  } else {
    if (body.recordingConsent !== true) return json({ error: "recording-consent-required" }, 400);
    consentedFields.push("recording");
  }

  const session = getOrCreateBrowserSession(req);
  const budget = consumeVaaniWebSessionBudget(clientIp(req));
  if (!budget.allowed) {
    return jsonWithSession({ error: budget.reason, retryable: false }, 429, session, {
      "Retry-After": String(budget.retryAfterSeconds),
    });
  }

  try {
    const call = await startVaaniBrowserCall({
      caseReference: typeof body.caseReference === "string" ? body.caseReference : undefined,
      language: body.language,
      channel: "webrtc",
      consentedFields,
    });
    return jsonWithSession({
      ok: true,
      // Room credentials, scoped to this room and this caller. The API key that
      // minted them never leaves the server.
      connectionUrl: call.connectionUrl,
      token: call.token,
      captionsUrl: call.captionsUrl,
      recordingState,
      // The same capability the callback flow uses, so the case page can ask for
      // the transcript, the outcome and the recording once the call has happened.
      transcriptToken: issueVaaniTranscriptToken(call.roomName, session.id),
    }, 200, session);
  } catch (error) {
    const kind = error instanceof VaaniProviderError ? error.kind : "provider-unavailable";
    console.error("Vaani browser call not started", { kind });
    return jsonWithSession({ error: "session-not-created", providerFailure: kind, retryable: kind === "provider-unavailable" }, 502, session);
  }
}

export function GET() {
  return NextResponse.json({ error: "method-not-allowed" }, { status: 405 });
}
