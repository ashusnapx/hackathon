import {
  getVaaniWebConfiguration,
  getVaaniRecordingStream,
  readVaaniTranscriptToken,
  VAANI_CAPABILITY_PATTERN,
  requestHasSameOrigin,
  VaaniProviderError,
} from "@/lib/integrations/vaani";
import { json, readBrowserSessionId } from "@/lib/integrations/vaani-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;


/**
 * Play back the recording of the caller's own call.
 *
 * The bytes are proxied rather than copied into Kavach: the provider key never
 * reaches the browser, no second copy of a victim's voice is created, and the
 * capability that authorises this was only issued for a call where recording
 * consent was taken.
 */
export async function GET(req: Request) {
  if (!requestHasSameOrigin(req)) return json({ error: "same-origin-required" }, 403);
  if (!getVaaniWebConfiguration().ready) return json({ error: "live-voice-unavailable" }, 503);

  const token = new URL(req.url).searchParams.get("token") || "";
  if (!VAANI_CAPABILITY_PATTERN.test(token)) return json({ error: "invalid-transcript-capability" }, 400);

  const browserSessionId = readBrowserSessionId(req);
  const callId = browserSessionId && readVaaniTranscriptToken(token, browserSessionId);
  if (!callId) return json({ error: "invalid-or-expired-transcript-capability", retryable: false }, 401);

  try {
    const upstream = await getVaaniRecordingStream(callId);
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "audio/mpeg",
        "Cache-Control": "no-store, max-age=0",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const kind = error instanceof VaaniProviderError ? error.kind : "provider-unavailable";
    if (kind === "transcript-not-ready") return json({ error: "recording-not-ready", retryable: true }, 425);
    return json({ error: "recording-unavailable", providerFailure: kind }, 502);
  }
}
