export const MAX_AI_JSON_REQUEST_BYTES = 512 * 1024;

export type AiJsonRequestResult =
  | { ok: true; value: unknown }
  | {
      ok: false;
      status: 400 | 403 | 411 | 413 | 415;
      error:
        | "same-origin-required"
        | "json-required"
        | "content-length-required"
        | "request-too-large"
        | "invalid-json";
    };

export function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin || origin === "null") return false;
  try {
    return new URL(origin).origin === new URL(req.url).origin;
  } catch {
    return false;
  }
}

/**
 * Read a JSON request without trusting `Content-Length` as the only bound.
 *
 * Requiring a same-origin browser request is a CSRF/casual-hotlink barrier, not
 * authentication. The stream limit is still necessary because a custom client
 * can lie about its declared size.
 */
export async function readAiJsonRequest(
  req: Request,
  maxBytes = MAX_AI_JSON_REQUEST_BYTES,
): Promise<AiJsonRequestResult> {
  if (!hasSameOrigin(req)) {
    return { ok: false, status: 403, error: "same-origin-required" };
  }

  const contentType = req.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.split(";", 1)[0].trim() !== "application/json") {
    return { ok: false, status: 415, error: "json-required" };
  }

  const declared = req.headers.get("content-length");
  if (!declared || !/^\d+$/.test(declared)) {
    return { ok: false, status: 411, error: "content-length-required" };
  }
  const declaredBytes = Number(declared);
  if (!Number.isSafeInteger(declaredBytes)) {
    return { ok: false, status: 411, error: "content-length-required" };
  }
  if (declaredBytes > maxBytes) {
    return { ok: false, status: 413, error: "request-too-large" };
  }
  if (!req.body) {
    return { ok: false, status: 400, error: "invalid-json" };
  }

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      return { ok: false, status: 413, error: "request-too-large" };
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, status: 400, error: "invalid-json" };
  }
}

const PROVIDER_WINDOW_MS = 10 * 60 * 1000;
export const MAX_AI_PROVIDER_REQUESTS_PER_CLIENT = 30;
export const MAX_AI_PROVIDER_REQUESTS_PER_PROCESS = 180;
const providerAttempts = new Map<string, number[]>();

function recentAttempts(key: string, now: number): number[] {
  const recent = (providerAttempts.get(key) ?? []).filter(
    (time) => now - time < PROVIDER_WINDOW_MS,
  );
  if (recent.length) providerAttempts.set(key, recent);
  else providerAttempts.delete(key);
  return recent;
}

function retryAfter(recent: number[], now: number): number {
  return Math.max(1, Math.ceil((recent[0] + PROVIDER_WINDOW_MS - now) / 1000));
}

/**
 * A last-resort, in-process cost fuse. A public deployment still needs a
 * trusted-proxy identity and a shared edge/Redis quota across server instances.
 */
export function claimAiProviderSlot(
  req: Request,
  now = Date.now(),
): { allowed: boolean; retryAfterSeconds: number } {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const client = req.headers.get("x-real-ip") || forwarded || "unknown-client";
  const clientKey = `client:${client}`;
  const globalKey = "__all_clients__";
  const clientRecent = recentAttempts(clientKey, now);
  const globalRecent = recentAttempts(globalKey, now);

  if (clientRecent.length >= MAX_AI_PROVIDER_REQUESTS_PER_CLIENT) {
    return { allowed: false, retryAfterSeconds: retryAfter(clientRecent, now) };
  }
  if (globalRecent.length >= MAX_AI_PROVIDER_REQUESTS_PER_PROCESS) {
    return { allowed: false, retryAfterSeconds: retryAfter(globalRecent, now) };
  }

  clientRecent.push(now);
  globalRecent.push(now);
  providerAttempts.set(clientKey, clientRecent);
  providerAttempts.set(globalKey, globalRecent);
  return { allowed: true, retryAfterSeconds: 0 };
}

export function resetAiProviderLimitForTests() {
  providerAttempts.clear();
}
