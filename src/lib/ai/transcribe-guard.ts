export const MAX_TRANSCRIPTION_AUDIO_BYTES = 25 * 1024 * 1024;
export const MAX_TRANSCRIPTION_REQUEST_BYTES = 26 * 1024 * 1024;

export type TranscriptionRequestGuard =
  | { ok: true }
  | { ok: false; status: 403 | 411 | 413 | 415; error: string };

/** Reject cross-site, unbounded and non-multipart bodies before formData buffers them. */
export function guardTranscriptionRequest(req: Request): TranscriptionRequestGuard {
  const origin = req.headers.get("origin");
  if (!origin || origin !== new URL(req.url).origin) {
    return { ok: false, status: 403, error: "same-origin-required" };
  }
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data;")) {
    return { ok: false, status: 415, error: "multipart-required" };
  }
  const declaredLength = Number(req.headers.get("content-length"));
  if (!Number.isFinite(declaredLength) || declaredLength <= 0) {
    return { ok: false, status: 411, error: "content-length-required" };
  }
  if (declaredLength > MAX_TRANSCRIPTION_REQUEST_BYTES) {
    return { ok: false, status: 413, error: "request-too-large" };
  }
  return { ok: true };
}

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;
const attempts = new Map<string, number[]>();

/** In-process prototype throttle; production still needs a shared edge limiter. */
export function claimTranscriptionSlot(key: string, now = Date.now()): { allowed: boolean; retryAfterSeconds: number } {
  const recent = (attempts.get(key) ?? []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((recent[0] + WINDOW_MS - now) / 1000)),
    };
  }
  recent.push(now);
  attempts.set(key, recent);
  return { allowed: true, retryAfterSeconds: 0 };
}

export function resetTranscriptionLimitForTests() {
  attempts.clear();
}
