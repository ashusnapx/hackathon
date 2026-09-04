import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import {
  completeVaaniDispatch,
  consumeVaaniDispatchBudget,
  dispatchVaaniCall,
  finishVaaniDispatchWithoutResult,
  getVaaniLiveConfiguration,
  issueVaaniTranscriptToken,
  readSmallJson,
  requestHasSameOrigin,
  reserveVaaniDispatch,
  validateVaaniDispatchBody,
  vaaniDispatchFingerprint,
  VaaniProviderError,
} from "@/lib/integrations/vaani";

export const runtime = "nodejs";
export const maxDuration = 30;

const SESSION_COOKIE = "kavach_vaani_session";
const SESSION_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export async function POST(req: Request) {
  if (!requestHasSameOrigin(req)) {
    return json({ error: "same-origin-required" }, 403);
  }

  const parsed = await readSmallJson(req, 2_048);
  if (!parsed.ok) {
    const status = parsed.error === "unsupported-media-type" ? 415
      : parsed.error === "body-too-large" ? 413
        : 400;
    return json({ error: parsed.error }, status);
  }
  const validation = validateVaaniDispatchBody(parsed.value);
  if (!validation.ok) return json({ error: validation.error }, 400);
  const body = validation.value;

  const config = getVaaniLiveConfiguration();
  if (!config.ready) {
    return json(
      { error: "live-voice-unavailable", simulationAvailable: true, retryable: false },
      503,
    );
  }
  if (!config.allowedTestNumbers.has(body.contactNumber)) {
    return json({ error: "number-not-allowlisted", retryable: false }, 403);
  }

  const session = getOrCreateSession(req);
  const fingerprint = vaaniDispatchFingerprint(body.contactNumber, body.language);
  const reservation = reserveVaaniDispatch(body.requestId, session.id, fingerprint);
  if (reservation.kind === "complete") {
    return jsonWithSession({
      ok: true,
      requestId: body.requestId,
      state: "requested",
      duplicate: true,
      agentName: reservation.result.agentName,
      transcriptToken: issueVaaniTranscriptToken(reservation.result.callId, session.id),
      transcriptCapabilityExpiresInSeconds: 3_600,
    }, 200, session);
  }
  if (reservation.kind === "conflict") {
    return jsonWithSession({ error: "request-id-conflict", retryable: false }, 409, session);
  }
  if (reservation.kind === "session-mismatch") {
    return jsonWithSession({ error: "request-session-mismatch", retryable: false }, 403, session);
  }
  if (reservation.kind === "pending" || reservation.kind === "ambiguous") {
    return jsonWithSession({
      error: "dispatch-state-unknown",
      requestId: body.requestId,
      retryable: false,
    }, 409, session);
  }
  if (reservation.kind === "failed") {
    return jsonWithSession({
      error: "dispatch-previously-rejected",
      requestId: body.requestId,
      retryable: false,
    }, 409, session);
  }

  const limit = consumeVaaniDispatchBudget(clientIp(req), body.contactNumber);
  if (!limit.allowed) {
    finishVaaniDispatchWithoutResult(body.requestId, "failed");
    return jsonWithSession({
      error: limit.reason,
      retryable: false,
    }, 429, session, { "Retry-After": String(limit.retryAfterSeconds) });
  }

  try {
    const result = await dispatchVaaniCall({
      contactNumber: body.contactNumber,
      language: body.language,
    });
    completeVaaniDispatch(body.requestId, result);
    return jsonWithSession({
      ok: true,
      requestId: body.requestId,
      state: "requested",
      duplicate: false,
      agentName: result.agentName,
      transcriptToken: issueVaaniTranscriptToken(result.callId, session.id),
      transcriptCapabilityExpiresInSeconds: 3_600,
    }, 200, session);
  } catch (error) {
    const failure = error instanceof VaaniProviderError ? error.kind : "dispatch-ambiguous";
    const ambiguous = failure === "dispatch-ambiguous";
    finishVaaniDispatchWithoutResult(body.requestId, ambiguous ? "ambiguous" : "failed");
    console.error("Vaani dispatch ended without confirmation", { failure });
    return jsonWithSession({
      error: ambiguous ? "dispatch-state-unknown" : "call-request-rejected",
      requestId: body.requestId,
      retryable: false,
    }, ambiguous ? 502 : 422, session);
  }
}

interface VaaniSession {
  id: string;
  secure: boolean;
}

function getOrCreateSession(req: Request): VaaniSession {
  const cookieHeader = req.headers.get("cookie") || "";
  const existing = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  if (existing && SESSION_PATTERN.test(existing)) {
    return {
      id: existing,
      secure: process.env.NODE_ENV === "production" || new URL(req.url).protocol === "https:",
    };
  }
  return {
    id: randomBytes(32).toString("base64url"),
    secure: process.env.NODE_ENV === "production" || new URL(req.url).protocol === "https:",
  };
}

function clientIp(req: Request): string {
  // These headers are trustworthy only behind a proxy that overwrites them.
  // The limiter is a prototype guard, not a production abuse-control boundary.
  return req.headers.get("x-real-ip")
    || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown-client";
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

function jsonWithSession(
  payload: object,
  status: number,
  session: VaaniSession,
  headers?: Record<string, string>,
) {
  const response = json(payload, status, headers);
  response.cookies.set({
    name: SESSION_COOKIE,
    value: session.id,
    httpOnly: true,
    sameSite: "strict",
    secure: session.secure,
    path: "/api/vaani",
    maxAge: 60 * 60,
  });
  return response;
}
