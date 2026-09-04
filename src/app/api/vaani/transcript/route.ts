import { NextResponse } from "next/server";
import {
  getVaaniWebConfiguration,
  getVaaniTranscript,
  readSmallJson,
  readVaaniTranscriptToken,
  requestHasSameOrigin,
  VaaniProviderError,
} from "@/lib/integrations/vaani";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

const SESSION_COOKIE = "kavach_vaani_session";
const SESSION_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export async function POST(req: Request) {
  if (!requestHasSameOrigin(req)) {
    return json({ error: "same-origin-required" }, 403);
  }
  // Gated on the core live-voice requirements, not on the telephony allowlist:
  // a browser session produces the same artifacts and dials no one.
  if (!getVaaniWebConfiguration().ready) {
    return json({ error: "live-voice-unavailable", retryable: false }, 503);
  }

  const parsed = await readSmallJson(req, 512);
  if (!parsed.ok) {
    const status = parsed.error === "unsupported-media-type" ? 415
      : parsed.error === "body-too-large" ? 413
        : 400;
    return json({ error: parsed.error }, status);
  }
  if (!parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return json({ error: "invalid-json-object" }, 400);
  }
  const body = parsed.value as Record<string, unknown>;
  if (Object.keys(body).some((key) => key !== "token")) {
    return json({ error: "unexpected-field" }, 400);
  }
  if (typeof body.token !== "string" || !TOKEN_PATTERN.test(body.token)) {
    return json({ error: "invalid-transcript-capability" }, 400);
  }

  const sessionId = readSessionId(req);
  const callId = sessionId && readVaaniTranscriptToken(body.token, sessionId);
  if (!callId) {
    return json({ error: "invalid-or-expired-transcript-capability", retryable: false }, 401);
  }

  try {
    return json({ transcript: await getVaaniTranscript(callId) }, 200);
  } catch (error) {
    if (!(error instanceof VaaniProviderError)) {
      return json({ error: "transcript-provider-error", retryable: false }, 502);
    }
    if (error.kind === "transcript-not-ready") {
      return json(
        { error: "transcript-not-ready", retryable: true },
        425,
        { "Retry-After": "10" },
      );
    }
    if (error.kind === "provider-rate-limited") {
      const retryAfter = error.retryAfterSeconds || 30;
      return json(
        { error: "transcript-provider-rate-limited", retryable: true },
        429,
        { "Retry-After": String(retryAfter) },
      );
    }
    if (error.kind === "provider-auth") {
      return json({ error: "transcript-provider-auth-error", retryable: false }, 502);
    }
    if (error.kind === "provider-unavailable") {
      return json(
        { error: "transcript-provider-unavailable", retryable: true },
        503,
        { "Retry-After": "30" },
      );
    }
    return json({ error: "transcript-provider-response-invalid", retryable: false }, 502);
  }
}

function readSessionId(req: Request): string | null {
  const cookieHeader = req.headers.get("cookie") || "";
  const value = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  return value && SESSION_PATTERN.test(value) ? value : null;
}

function json(payload: object, status: number, headers?: Record<string, string>) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
      ...headers,
    },
  });
}
