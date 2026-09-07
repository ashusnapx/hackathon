import {
  getVaaniWebConfiguration,
  getVaaniRecordingStream,
  readVaaniTranscriptToken,
  VAANI_CAPABILITY_PATTERN,
  requestFromSameOrigin,
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
  // The player is an `<audio>` tag, not `fetch`: it sends no `Origin` header,
  // so the strict fetch-only check rejects every playback with a 403 the
  // player swallows without a word. The media-aware check admits the caller's
  // own page and nothing else — the session-bound token below still applies.
  if (!requestFromSameOrigin(req)) return json({ error: "same-origin-required" }, 403);
  if (!getVaaniWebConfiguration().ready) return json({ error: "live-voice-unavailable" }, 503);

  const token = new URL(req.url).searchParams.get("token") || "";
  if (!VAANI_CAPABILITY_PATTERN.test(token)) return json({ error: "invalid-transcript-capability" }, 400);

  const browserSessionId = readBrowserSessionId(req);
  const callId = browserSessionId && readVaaniTranscriptToken(token, browserSessionId);
  if (!callId) return json({ error: "invalid-or-expired-transcript-capability", retryable: false }, 401);

  try {
    const upstream = await getVaaniRecordingStream(callId, req.headers.get("range"));
    const contentType = upstream.headers.get("content-type") || "";
    // The provider answers some failures with a 200 carrying a JSON or text
    // error envelope. Served as audio under `nosniff`, that is a dead player
    // with no explanation; fail loudly as JSON instead.
    if (contentType && !/^(audio\/|application\/octet-stream)/i.test(contentType.split(";", 1)[0].trim())) {
      await upstream.body?.cancel().catch(() => undefined);
      throw new VaaniProviderError("provider-response-invalid", upstream.status);
    }
    const headers: Record<string, string> = {
      "Content-Type": contentType || "audio/mpeg",
      "Cache-Control": "no-store, max-age=0",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
    };
    // A ranged answer (206) must carry its range description back, or the
    // player cannot assemble what it asked for. Length and range support ride
    // along wherever the provider offers them.
    for (const name of ["content-range", "content-length", "accept-ranges"]) {
      const value = upstream.headers.get(name);
      if (value) headers[name] = value;
    }
    return new Response(upstream.body, {
      status: upstream.status === 206 ? 206 : 200,
      headers,
    });
  } catch (error) {
    const kind = error instanceof VaaniProviderError ? error.kind : "provider-unavailable";
    if (kind === "transcript-not-ready") return json({ error: "recording-not-ready", retryable: true }, 425);
    return json({ error: "recording-unavailable", providerFailure: kind }, 502);
  }
}
