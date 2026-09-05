import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const VAANI_ENDPOINT = "https://api.vaanivoice.ai/api";
const E164_PATTERN = /^\+[1-9]\d{7,14}$/;
const REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TRANSCRIPT_CAPABILITY_TTL_MS = 60 * 60 * 1000;
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;
const MAX_CALLS_PER_IP_PER_HOUR = 3;
const MAX_CALLS_PER_NUMBER_PER_DAY = 2;
const DEFAULT_DAILY_CALL_LIMIT = 10;
const MAX_CONFIGURABLE_DAILY_CALL_LIMIT = 100;

const SUPPORTED_LANGUAGES = new Set([
  "en", "hi", "bn", "mr", "te", "ta", "gu", "ur", "kn", "or", "ml", "pa",
  "as", "mai", "sat", "ks", "ne", "sd", "doi", "kok", "mni", "brx", "sa",
]);

type Environment = Record<string, string | undefined>;

export interface VaaniDispatchInput {
  contactNumber: string;
  language: string;
}

export interface VaaniDispatchResult {
  callId: string;
  agentName?: string;
}

export interface ValidatedVaaniDispatchBody {
  contactNumber: string;
  language: string;
  requestId: string;
  safeToSpeak: true;
  callbackConsent: true;
  transcriptionConsent: true;
  recordingConsent: true;
}

export type VaaniConfigProblem =
  | "live-mode-disabled"
  | "missing-api-key"
  | "missing-agent-id"
  | "reviewed-agent-id-mismatch"
  | "empty-or-invalid-test-number-allowlist";

export interface VaaniLiveConfiguration {
  ready: boolean;
  problems: VaaniConfigProblem[];
  allowedTestNumbers: ReadonlySet<string>;
}

/**
 * Live telephony is fail-closed. Credentials alone never enable a call: an
 * operator must deliberately enable live mode, bind the reviewed agent ID,
 * and enumerate every test destination in exact E.164 form.
 */
export function getVaaniLiveConfiguration(env: Environment = process.env): VaaniLiveConfiguration {
  const problems: VaaniConfigProblem[] = [];
  if (env.VAANI_LIVE_ENABLED !== "true") problems.push("live-mode-disabled");
  if (!env.VAANI_API_KEY?.trim()) problems.push("missing-api-key");
  if (!env.VAANI_AGENT_ID?.trim()) problems.push("missing-agent-id");
  if (
    !env.VAANI_REVIEWED_AGENT_ID?.trim()
    || env.VAANI_REVIEWED_AGENT_ID.trim() !== env.VAANI_AGENT_ID?.trim()
  ) {
    problems.push("reviewed-agent-id-mismatch");
  }

  const rawAllowlist = env.VAANI_ALLOWED_TEST_NUMBERS || "";
  const entries = rawAllowlist.split(",").map((entry) => entry.trim()).filter(Boolean);
  const allowedTestNumbers = new Set(entries);
  if (
    entries.length === 0
    || allowedTestNumbers.size !== entries.length
    || entries.some((entry) => !E164_PATTERN.test(entry))
  ) {
    problems.push("empty-or-invalid-test-number-allowlist");
    allowedTestNumbers.clear();
  }

  return { ready: problems.length === 0, problems, allowedTestNumbers };
}

export function vaaniConfigured(): boolean {
  return getVaaniLiveConfiguration().ready;
}

export function validateVaaniDispatchBody(
  value: unknown,
): { ok: true; value: ValidatedVaaniDispatchBody } | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "invalid-json-object" };
  }

  const body = value as Record<string, unknown>;
  const permitted = new Set([
    "contactNumber",
    "language",
    "requestId",
    "safeToSpeak",
    "callbackConsent",
    "transcriptionConsent",
    "recordingConsent",
  ]);
  if (Object.keys(body).some((key) => !permitted.has(key))) {
    return { ok: false, error: "unexpected-field" };
  }
  if (typeof body.contactNumber !== "string" || !E164_PATTERN.test(body.contactNumber)) {
    return { ok: false, error: "invalid-e164-number" };
  }
  if (typeof body.language !== "string" || !SUPPORTED_LANGUAGES.has(body.language)) {
    return { ok: false, error: "unsupported-language" };
  }
  if (typeof body.requestId !== "string" || !REQUEST_ID_PATTERN.test(body.requestId)) {
    return { ok: false, error: "invalid-request-id" };
  }
  if (body.safeToSpeak !== true) return { ok: false, error: "safe-to-speak-required" };
  if (body.callbackConsent !== true) return { ok: false, error: "callback-consent-required" };
  if (body.transcriptionConsent !== true) {
    return { ok: false, error: "transcription-consent-required" };
  }
  if (body.recordingConsent !== true) {
    return { ok: false, error: "recording-consent-required" };
  }

  return {
    ok: true,
    value: {
      contactNumber: body.contactNumber,
      language: body.language,
      requestId: body.requestId,
      safeToSpeak: true,
      callbackConsent: true,
      transcriptionConsent: true,
      recordingConsent: true,
    },
  };
}

export function requestHasSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin || origin === "null") return false;
  try {
    return new URL(origin).origin === new URL(req.url).origin;
  } catch {
    return false;
  }
}

export type SmallJsonResult =
  | { ok: true; value: unknown }
  | { ok: false; error: "unsupported-media-type" | "body-too-large" | "invalid-json" };

/** Read a bounded JSON body without first buffering an attacker-controlled size. */
export async function readSmallJson(req: Request, maxBytes = 4_096): Promise<SmallJsonResult> {
  const contentType = req.headers.get("content-type")?.toLowerCase() || "";
  if (contentType.split(";", 1)[0].trim() !== "application/json") {
    return { ok: false, error: "unsupported-media-type" };
  }
  const declaredLength = Number(req.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return { ok: false, error: "body-too-large" };
  }
  if (!req.body) return { ok: false, error: "invalid-json" };

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      return { ok: false, error: "body-too-large" };
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
    return { ok: true, value: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) };
  } catch {
    return { ok: false, error: "invalid-json" };
  }
}

/**
 * Capabilities are signed, not stored.
 *
 * A Map worked on one machine and failed quietly on serverless: the instance
 * that issued a token is rarely the one asked to honour it, so the case page
 * lost its recording at random. Signing carries the same guarantees — opaque to
 * the browser, bound to one session, expiring, tamper-evident — with no shared
 * store and no state to prune.
 *
 * The key is derived from the provider API key, which every path that issues a
 * capability already requires, so this adds nothing to configure.
 */
export const VAANI_CAPABILITY_PATTERN = /^[A-Za-z0-9_-]{8,256}\.[A-Za-z0-9_-]{43}$/;

function capabilitySecret(): Buffer | null {
  const apiKey = process.env.VAANI_API_KEY?.trim();
  if (!apiKey) return null;
  return createHash("sha256").update(`kavach-capability-v1:${apiKey}`).digest();
}

function capabilityMac(payload: string, sessionId: string, secret: Buffer): string {
  return createHmac("sha256", secret).update(`${payload}\u0000${sessionId}`).digest("base64url");
}

export function issueVaaniTranscriptToken(callId: string, sessionId: string, now = Date.now()): string {
  const secret = capabilitySecret();
  if (!secret) throw new VaaniProviderError("provider-auth");
  const payload = Buffer.from(`${callId}\u0000${now + TRANSCRIPT_CAPABILITY_TTL_MS}`).toString("base64url");
  return `${payload}.${capabilityMac(payload, sessionId, secret)}`;
}

export function readVaaniTranscriptToken(
  token: string,
  sessionId: string,
  now = Date.now(),
): string | null {
  if (!VAANI_CAPABILITY_PATTERN.test(token) || !sessionId) return null;
  const secret = capabilitySecret();
  if (!secret) return null;

  const [payload, mac] = token.split(".");
  const expected = capabilityMac(payload, sessionId, secret);
  const given = Buffer.from(mac, "base64url");
  const want = Buffer.from(expected, "base64url");
  // Compared in constant time: a length check first, because timingSafeEqual
  // throws on a mismatch rather than returning false.
  if (given.length !== want.length || !timingSafeEqual(given, want)) return null;

  const [callId, expiresAt] = Buffer.from(payload, "base64url").toString("utf8").split("\u0000");
  if (!callId || !expiresAt || Number(expiresAt) <= now) return null;
  return callId;
}

type IdempotencyStatus = "pending" | "complete" | "ambiguous" | "failed";

interface IdempotencyRecord {
  sessionId: string;
  fingerprint: string;
  status: IdempotencyStatus;
  createdAt: number;
  result?: VaaniDispatchResult;
}

export type VaaniDispatchReservation =
  | { kind: "reserved" }
  | { kind: "conflict" }
  | { kind: "session-mismatch" }
  | { kind: "pending" }
  | { kind: "ambiguous" }
  | { kind: "failed" }
  | { kind: "complete"; result: VaaniDispatchResult };

const idempotencyRecords = new Map<string, IdempotencyRecord>();

export function vaaniDispatchFingerprint(contactNumber: string, language: string): string {
  return createHash("sha256").update(`${contactNumber}\u0000${language}`).digest("hex");
}

export function reserveVaaniDispatch(
  requestId: string,
  sessionId: string,
  fingerprint: string,
  now = Date.now(),
): VaaniDispatchReservation {
  pruneIdempotency(now);
  const existing = idempotencyRecords.get(requestId);
  if (!existing) {
    idempotencyRecords.set(requestId, {
      sessionId,
      fingerprint,
      status: "pending",
      createdAt: now,
    });
    return { kind: "reserved" };
  }
  if (existing.fingerprint !== fingerprint) return { kind: "conflict" };
  if (existing.sessionId !== sessionId) return { kind: "session-mismatch" };
  if (existing.status === "complete" && existing.result) {
    return { kind: "complete", result: existing.result };
  }
  if (existing.status === "pending") return { kind: "pending" };
  if (existing.status === "failed") return { kind: "failed" };
  return { kind: "ambiguous" };
}

export function completeVaaniDispatch(requestId: string, result: VaaniDispatchResult): void {
  const record = idempotencyRecords.get(requestId);
  if (record?.status === "pending") {
    record.status = "complete";
    record.result = result;
  }
}

export function finishVaaniDispatchWithoutResult(
  requestId: string,
  status: "ambiguous" | "failed",
): void {
  const record = idempotencyRecords.get(requestId);
  if (record?.status === "pending") record.status = status;
}

function pruneIdempotency(now: number) {
  for (const [requestId, record] of idempotencyRecords) {
    if (record.createdAt + IDEMPOTENCY_TTL_MS < now) idempotencyRecords.delete(requestId);
  }
}

const ipAttempts = new Map<string, number[]>();
const numberAttempts = new Map<string, number[]>();
const globalAttemptsByDay = new Map<number, number>();

export type VaaniLimitResult =
  | { allowed: true }
  | { allowed: false; reason: "ip-hourly-limit" | "number-daily-limit" | "daily-circuit-open"; retryAfterSeconds: number };

/** Reserve one provider attempt in process memory before making a live call. */
export function consumeVaaniDispatchBudget(
  ip: string,
  contactNumber: string,
  now = Date.now(),
  env: Environment = process.env,
): VaaniLimitResult {
  const ipKey = opaqueIdentifier(ip || "unknown-client");
  const numberKey = opaqueIdentifier(contactNumber);
  const recentIp = recentAttempts(ipAttempts, ipKey, now - ONE_HOUR_MS);
  if (recentIp.length >= MAX_CALLS_PER_IP_PER_HOUR) {
    return {
      allowed: false,
      reason: "ip-hourly-limit",
      retryAfterSeconds: secondsUntil(recentIp[0] + ONE_HOUR_MS, now),
    };
  }
  const recentNumber = recentAttempts(numberAttempts, numberKey, now - ONE_DAY_MS);
  if (recentNumber.length >= MAX_CALLS_PER_NUMBER_PER_DAY) {
    return {
      allowed: false,
      reason: "number-daily-limit",
      retryAfterSeconds: secondsUntil(recentNumber[0] + ONE_DAY_MS, now),
    };
  }

  const day = Math.floor(now / ONE_DAY_MS);
  const rawDailyLimit = Number(env.VAANI_DAILY_CALL_LIMIT);
  const dailyLimit = Number.isInteger(rawDailyLimit) && rawDailyLimit > 0
    ? Math.min(rawDailyLimit, MAX_CONFIGURABLE_DAILY_CALL_LIMIT)
    : DEFAULT_DAILY_CALL_LIMIT;
  const usedToday = globalAttemptsByDay.get(day) || 0;
  if (usedToday >= dailyLimit) {
    return {
      allowed: false,
      reason: "daily-circuit-open",
      retryAfterSeconds: secondsUntil((day + 1) * ONE_DAY_MS, now),
    };
  }

  recentIp.push(now);
  recentNumber.push(now);
  ipAttempts.set(ipKey, recentIp);
  numberAttempts.set(numberKey, recentNumber);
  globalAttemptsByDay.clear();
  globalAttemptsByDay.set(day, usedToday + 1);
  return { allowed: true };
}

function recentAttempts(store: Map<string, number[]>, key: string, after: number): number[] {
  return (store.get(key) || []).filter((attempt) => attempt > after);
}

function opaqueIdentifier(value: string): string {
  return createHash("sha256").update(value).digest("base64url");
}

function secondsUntil(target: number, now: number): number {
  return Math.max(1, Math.ceil((target - now) / 1000));
}

export type VaaniProviderFailure =
  | "dispatch-rejected"
  | "dispatch-ambiguous"
  | "transcript-not-ready"
  | "provider-rate-limited"
  | "provider-auth"
  | "provider-unavailable"
  | "provider-response-invalid";

export class VaaniProviderError extends Error {
  constructor(
    public readonly kind: VaaniProviderFailure,
    public readonly providerStatus?: number,
    public readonly retryAfterSeconds?: number,
  ) {
    super(kind);
    this.name = "VaaniProviderError";
  }
}

/**
 * Server-only Vaani adapter. The provider receives a fixed neutral name and no
 * user-supplied narrative, personal name, or case reference in metadata.
 */
export async function dispatchVaaniCall(input: VaaniDispatchInput): Promise<VaaniDispatchResult> {
  const config = getVaaniLiveConfiguration();
  const apiKey = process.env.VAANI_API_KEY;
  const agentId = process.env.VAANI_AGENT_ID;
  if (!config.ready || !apiKey || !agentId || !config.allowedTestNumbers.has(input.contactNumber)) {
    throw new VaaniProviderError("dispatch-rejected");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    let response: Response;
    try {
      response = await fetch(`${VAANI_ENDPOINT}/trigger-call/`, {
        method: "POST",
        headers: {
          "X-API-Key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_id: agentId,
          medium: "telephony",
          contact_number: input.contactNumber,
          name: "Kavach caller",
          metadata: {
            preferred_language: input.language,
            consent_source: "kavach-web",
          },
          dnd_check_skipped: false,
        }),
        cache: "no-store",
        signal: controller.signal,
      });
    } catch {
      // A network error or timeout can happen after the provider accepted the
      // request. Treat it as unknown; callers must never retry automatically.
      throw new VaaniProviderError("dispatch-ambiguous");
    }

    const data = await response.json().catch(() => null) as {
      success?: boolean;
      output?: { call_id?: string; agent_name?: string; live_captions_url?: string };
    } | null;

    const callId = data?.output?.call_id;
    const agentName = data?.output?.agent_name;
    if (!response.ok) {
      const ambiguous = response.status === 408 || response.status === 409
        || response.status === 425 || response.status === 429 || response.status >= 500;
      throw new VaaniProviderError(
        ambiguous ? "dispatch-ambiguous" : "dispatch-rejected",
        response.status,
      );
    }

    if (
      !data?.success
      || typeof callId !== "string"
      || !/^[A-Za-z0-9_-]{6,160}$/.test(callId)
    ) {
      // A 2xx means the provider may already have accepted the call. Invalid
      // JSON or a drifted success schema is therefore unknown, never a safe
      // rejection that permits a second dispatch.
      throw new VaaniProviderError("dispatch-ambiguous", response.status);
    }

    return {
      callId,
      agentName: typeof agentName === "string"
        ? agentName.slice(0, 100)
        : undefined,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getVaaniTranscript(callId: string): Promise<string> {
  // The core live-voice requirements, not the telephony allowlist: a browser
  // session has no number to allowlist and produces the same transcript.
  const config = getVaaniWebConfiguration();
  const apiKey = process.env.VAANI_API_KEY;
  if (!config.ready || !apiKey) throw new VaaniProviderError("provider-auth");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  let response: Response;
  try {
    response = await fetch(`${VAANI_ENDPOINT}/transcript/${encodeURIComponent(callId)}`, {
      headers: { "X-API-Key": apiKey },
      cache: "no-store",
      signal: controller.signal,
    });
  } catch {
    throw new VaaniProviderError("provider-unavailable");
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 404) throw new VaaniProviderError("transcript-not-ready", 404);
  if (response.status === 429) {
    throw new VaaniProviderError(
      "provider-rate-limited",
      429,
      parseRetryAfter(response.headers.get("retry-after")),
    );
  }
  if (response.status === 401 || response.status === 403) {
    throw new VaaniProviderError("provider-auth", response.status);
  }
  if (response.status >= 500) throw new VaaniProviderError("provider-unavailable", response.status);

  const data = await response.json().catch(() => null) as { transcript?: unknown; error?: unknown } | null;
  if (!response.ok || typeof data?.transcript !== "string" || !data.transcript.trim()) {
    throw new VaaniProviderError("provider-response-invalid", response.status);
  }
  // The provider answers 200 for a call it cannot find, with its own error text
  // sitting in the transcript field. Returned as-is, "Error retrieving
  // transcript" would be shown to a victim as their own words.
  if (isVaaniTranscriptError(data)) throw new VaaniProviderError("transcript-not-ready", 404);
  return cleanVaaniTranscript(data.transcript);
}

/**
 * Strip the speech-synthesis markup the provider leaves in its transcripts.
 *
 * The raw text carries directives like `<speed ratio="1"/>` and
 * `<break time="200ms"/>`. They are instructions to a voice engine, not words
 * anyone said, and a victim reading their own account back — or handing it to a
 * police station — should not have to explain them.
 */
export function cleanVaaniTranscript(transcript: string): string {
  return transcript
    .replace(/<\/?(?:speed|break|prosody|emphasis|say-as|phoneme|sub|voice|lang|p|s)\b[^>]*>/gi, "")
    .split("\n")
    .map((line) => line.replace(/[ \t]{2,}/g, " ").trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** A 200 that is really an error: the provider puts the failure in the body. */
export function isVaaniTranscriptError(payload: { transcript?: unknown; error?: unknown }): boolean {
  if (typeof payload.error === "string" && payload.error.trim()) return true;
  return typeof payload.transcript === "string"
    && /^error retrieving transcript/i.test(payload.transcript.trim());
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined;
  return Math.min(Math.ceil(seconds), 300);
}

/** Tests only: production correctness must never rely on these process-local maps. */
export function resetVaaniPrototypeStateForTests(): void {
  idempotencyRecords.clear();
  ipAttempts.clear();
  numberAttempts.clear();
  globalAttemptsByDay.clear();
  webSessionAttempts.clear();
}

// ── Browser voice sessions ──────────────────────────────────────────────────
// Telephony needs a provisioned number and dials a real phone. A WebRTC session
// needs neither: the person already in front of the browser speaks through the
// tab they opened themselves. That removes the two riskiest parts of a callback
// — dialling a number that may not be safe to answer, and leaving voicemail.

const CONSENT_POLICY_VERSION_FALLBACK = "prototype-unversioned";

/**
 * The first thing a caller hears, in their own language.
 *
 * Short on purpose: identity and "is it safe to speak" are the only parts that
 * cannot wait. The agent takes consent and lists the commands once the caller
 * has answered, rather than spending their first fifteen seconds on disclosures
 * they already read on the website.
 */
const GREETINGS: Record<string, string> = {
  en: "Hello, I'm Kavach Saathi, an AI assistant from Kavach — not the police or government. Please tell me what happened.",
  hi: "नमस्ते, मैं कवच साथी हूँ — कवच की AI सहायक, पुलिस या सरकार नहीं। बताइए, क्या हुआ?",
};

/**
 * Only languages a person has checked are listed. A first sentence to someone
 * who has just been defrauded is the wrong place for an unreviewed machine
 * translation, so anything else opens in English and the agent switches to the
 * caller's language from their first reply, as the prompt instructs.
 */
export function vaaniGreeting(language: string): string {
  return GREETINGS[language] ?? GREETINGS.en;
}
const CASE_REFERENCE_PATTERN = /^KVC-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
const SESSION_TOKEN_PATTERN = /^[A-Za-z0-9._-]{16,2048}$/;
const CALL_ID_PATTERN = /^[A-Za-z0-9_-]{6,160}$/;

const CONSENTABLE_PURPOSES = new Set([
  "voice_processing",
  "transcription",
  "recording",
  "storage",
  "human_review",
]);

export type VaaniRecordingState = "enabled" | "disabled" | "unknown";

/**
 * Vaani's public documentation does not establish that recording can be turned
 * off while transcription continues, so "disabled" is only ever an operator's
 * verified claim about a specific deployment. Absent that, the honest state is
 * unknown, and the caller is told so.
 */
export function getVaaniRecordingState(env: Environment = process.env): VaaniRecordingState {
  const raw = env.VAANI_RECORDING_STATE?.trim();
  return raw === "enabled" || raw === "disabled" ? raw : "unknown";
}

export function vaaniRecordingDisclosure(state: VaaniRecordingState): string {
  if (state === "enabled") return "This call is recorded.";
  if (state === "disabled") return "This call is not recorded.";
  return "I cannot confirm whether this call is recorded, so please assume it may be.";
}

export interface VaaniCallContext {
  /** Opaque Kavach case reference. Never a government number. */
  caseReference?: string;
  language: string;
  channel: "webrtc" | "pstn";
  consentedFields: readonly string[];
  /** Answered on the website before the microphone opened, so the agent does not re-ask. */
  safetyAnswer?: string;
  childContext?: string;
}

/**
 * The agent's prompt reads these by name, so a missing key is not a cosmetic
 * defect: the model reads the unresolved placeholder out loud.
 *
 * `summarised_problem` is deliberately sent empty. The prompt treats an empty
 * value as unknown and asks the caller directly, which costs one question and
 * keeps the allegation out of provider-held call metadata — the rule in
 * docs/LEGAL_BASIS.md and the VaaniSessionMetadataV1 contract.
 */
export function buildVaaniCallMetadata(
  context: VaaniCallContext,
  env: Environment = process.env,
): Record<string, string> {
  const recordingState = getVaaniRecordingState(env);
  const caseReference = context.caseReference && CASE_REFERENCE_PATTERN.test(context.caseReference)
    ? context.caseReference
    : "";
  const consented = [...new Set(context.consentedFields)]
    .filter((purpose) => CONSENTABLE_PURPOSES.has(purpose))
    .sort();

  const known = new Set(["safe", "danger", "prefer-not", "adult-or-no-child", "self-minor", "child-other", "unknown"]);

  return {
    case_id: caseReference,
    consented_fields: consented.join(","),
    summarised_problem: "",
    preferred_language: context.language,
    // Answered on screen already. Sent so the agent can skip them rather than
    // making someone repeat, on a call, what they just tapped.
    safety_answer: context.safetyAnswer && known.has(context.safetyAnswer) ? context.safetyAnswer : "",
    child_context: context.childContext && known.has(context.childContext) ? context.childContext : "",
    human_transfer_available: env.VAANI_HUMAN_TRANSFER_AVAILABLE === "true" ? "true" : "false",
    // Operational, not read by the prompt: kept so the call record says what the
    // caller was actually told about recording.
    channel: context.channel,
    recording_state: recordingState,
    recording_disclosure: vaaniRecordingDisclosure(recordingState),
    consent_policy_version: env.VAANI_CONSENT_POLICY_VERSION?.trim() || CONSENT_POLICY_VERSION_FALLBACK,
    consent_source: "kavach-web",
  };
}

export type VaaniWebConfigProblem = Exclude<VaaniConfigProblem, "empty-or-invalid-test-number-allowlist">;

export interface VaaniWebConfiguration {
  ready: boolean;
  problems: VaaniWebConfigProblem[];
}

/**
 * A browser session still requires a deliberately enabled live mode and a
 * reviewed agent, but not the test-number allowlist: nothing is dialled.
 */
export function getVaaniWebConfiguration(env: Environment = process.env): VaaniWebConfiguration {
  const problems = getVaaniLiveConfiguration(env).problems.filter(
    (problem): problem is VaaniWebConfigProblem => problem !== "empty-or-invalid-test-number-allowlist",
  );
  return { ready: problems.length === 0, problems };
}

export interface VaaniBrowserCall {
  /**
   * The room the conversation happens in. The provider files the call under this
   * same id, so it is what the case page later uses to ask for the transcript,
   * the outcome and the recording.
   */
  roomName: string;
  /** LiveKit participant token, scoped to this room. Safe to hand the caller. */
  token: string;
  connectionUrl: string;
  /** WebSocket carrying live transcription while the call is in progress. */
  captionsUrl?: string;
}

async function vaaniFetch(path: string, init: RequestInit, timeoutMs = 15_000): Promise<Response> {
  const apiKey = process.env.VAANI_API_KEY;
  if (!apiKey) throw new VaaniProviderError("provider-auth");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${VAANI_ENDPOINT}${path}`, {
      ...init,
      headers: { "X-API-Key": apiKey, "Content-Type": "application/json", ...(init.headers || {}) },
      cache: "no-store",
      signal: controller.signal,
    });
  } catch {
    throw new VaaniProviderError("provider-unavailable");
  } finally {
    clearTimeout(timeout);
  }
}

function assertProviderOk(response: Response): void {
  if (response.ok) return;
  if (response.status === 401 || response.status === 403) {
    throw new VaaniProviderError("provider-auth", response.status);
  }
  if (response.status === 429) throw new VaaniProviderError("provider-rate-limited", 429);
  if (response.status >= 500) throw new VaaniProviderError("provider-unavailable", response.status);
  throw new VaaniProviderError("dispatch-rejected", response.status);
}

/**
 * Open a browser voice call.
 *
 * This uses the WebRTC medium of the dispatch endpoint rather than Vaani's
 * hosted session widget: the widget's own page fails to authenticate a session
 * created with an API key ("Missing Authorization header"), while this path
 * returns self-contained room credentials the caller's browser can use directly.
 * It also needs no phone number, so nothing is dialled and no number is stored.
 */
export async function startVaaniBrowserCall(context: VaaniCallContext): Promise<VaaniBrowserCall> {
  const agentId = process.env.VAANI_AGENT_ID;
  if (!getVaaniWebConfiguration().ready || !agentId) throw new VaaniProviderError("dispatch-rejected");

  const response = await vaaniFetch("/trigger-call/", {
    method: "POST",
    body: JSON.stringify({
      agent_id: agentId,
      medium: "webrtc",
      name: "Kavach caller",
      // The agent is configured for one target language; the caller chose their
      // own. Sending it per call is what stops a Hindi voice reading English.
      primary_language: context.language,
      welcome_message: vaaniGreeting(context.language),
      welcome_interruptible: true,
      // The greeting has to be overridden per call, not per agent. A configured
      // greeting can only be in one language, an empty one makes Vaani fall back
      // to its own "you have reached our customer service" line, and the
      // top-level welcome_message is ignored on this medium — which together
      // produced two introductions, the first in the wrong language.
      modify_agent: {
        persona: {
          identity: {
            greeting_message: {
              agent_message: vaaniGreeting(context.language),
              interruptible: true,
              let_user_speak_first: false,
            },
          },
        },
      },
      metadata: buildVaaniCallMetadata({ ...context, channel: "webrtc" }),
    }),
  });
  assertProviderOk(response);

  const data = await response.json().catch(() => null) as {
    token?: unknown;
    room_name?: unknown;
    connection_url?: unknown;
    live_captions_url?: unknown;
  } | null;

  const token = data?.token;
  const roomName = data?.room_name;
  const connectionUrl = data?.connection_url;
  if (
    typeof token !== "string" || !SESSION_TOKEN_PATTERN.test(token)
    || typeof roomName !== "string" || !CALL_ID_PATTERN.test(roomName)
    || typeof connectionUrl !== "string" || !/^https:\/\//.test(connectionUrl)
  ) {
    throw new VaaniProviderError("provider-response-invalid", response.status);
  }

  const captionsUrl = typeof data?.live_captions_url === "string"
    && /^wss:\/\//.test(data.live_captions_url)
    ? data.live_captions_url
    : undefined;

  return { roomName, token, connectionUrl, captionsUrl };
}

export interface VaaniCallOutcome {
  callId: string;
  disposition?: string;
  /** Post-call extraction: draft values, never confirmed case facts. */
  extracted: Record<string, unknown>;
  summary?: string;
  transcriptAvailable: boolean;
}

/**
 * Post-call structured output. Every value here is a model's reading of what it
 * heard, so it comes back labelled as a draft and is never merged into the case
 * without the person confirming it.
 */
export async function getVaaniCallOutcome(callId: string): Promise<VaaniCallOutcome> {
  if (!CALL_ID_PATTERN.test(callId)) throw new VaaniProviderError("provider-response-invalid");
  const response = await vaaniFetch(`/call_details/${encodeURIComponent(callId)}`, { method: "GET" });
  if (response.status === 404) throw new VaaniProviderError("transcript-not-ready", 404);
  // 202 means post-processing is still running. It is a 2xx, so without this the
  // caller would be shown an empty extraction as though the agent heard nothing.
  if (response.status === 202) throw new VaaniProviderError("transcript-not-ready", 202);
  assertProviderOk(response);
  const raw = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!raw || typeof raw !== "object") throw new VaaniProviderError("provider-response-invalid", response.status);
  return normaliseVaaniCallOutcome(callId, raw);
}

/**
 * The provider documents call details as an open dict, so read defensively and
 * report what is actually present rather than asserting a schema.
 */
export function normaliseVaaniCallOutcome(callId: string, raw: Record<string, unknown>): VaaniCallOutcome {
  const pick = (...keys: string[]): unknown => {
    for (const key of keys) {
      const value = raw[key];
      if (value !== undefined && value !== null) return value;
    }
    return undefined;
  };
  const asRecord = (value: unknown): Record<string, unknown> =>
    value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

  const extracted = {
    ...asRecord(pick("extracted_information", "extracted_data", "entities", "data_points")),
  };
  const dispositions = asRecord(pick("dispositions", "evaluations"));
  const disposition = typeof dispositions.call_disposition === "string"
    ? dispositions.call_disposition
    : typeof extracted.call_outcome === "string" ? extracted.call_outcome : undefined;
  const summary = pick("summary");
  const transcript = pick("transcript");

  return {
    callId,
    disposition,
    extracted,
    summary: typeof summary === "string" && summary.trim() ? summary : undefined,
    transcriptAvailable: typeof transcript === "string" ? transcript.trim().length > 0 : Array.isArray(transcript),
  };
}

// ── Call budget ─────────────────────────────────────────────────────────────
const MAX_WEB_SESSIONS_PER_IP_PER_HOUR = 5;
const webSessionAttempts = new Map<string, number[]>();

export function consumeVaaniWebSessionBudget(
  ip: string,
  now = Date.now(),
): VaaniLimitResult {
  const key = opaqueIdentifier(ip || "unknown-client");
  const recent = recentAttempts(webSessionAttempts, key, now - ONE_HOUR_MS);
  if (recent.length >= MAX_WEB_SESSIONS_PER_IP_PER_HOUR) {
    return {
      allowed: false,
      reason: "ip-hourly-limit",
      retryAfterSeconds: secondsUntil(recent[0] + ONE_HOUR_MS, now),
    };
  }
  recent.push(now);
  webSessionAttempts.set(key, recent);
  return { allowed: true };
}

// ── Recording, history and agent inspection ─────────────────────────────────

/**
 * Stream the provider-held recording of a call.
 *
 * Kavach never copies the audio into its own store: it proxies the bytes so the
 * key stays server-side, and only for a call whose capability the browser holds.
 * A recording exists only where the caller consented to one.
 */
export async function getVaaniRecordingStream(callId: string): Promise<Response> {
  if (!CALL_ID_PATTERN.test(callId)) throw new VaaniProviderError("provider-response-invalid");
  const response = await vaaniFetch(`/stream/${encodeURIComponent(callId)}`, { method: "GET" }, 30_000);
  if (response.status === 404) throw new VaaniProviderError("transcript-not-ready", 404);
  assertProviderOk(response);
  return response;
}

export interface VaaniCallSummaryRow {
  callId: string;
  status?: string;
  startedAt?: string;
  durationSeconds?: number;
}

/** Operator-side call log. Never exposed to a victim's browser. */
export async function getVaaniCallHistory(page = 1, pageSize = 20): Promise<VaaniCallSummaryRow[]> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  const response = await vaaniFetch(`/call-history?${params}`, { method: "GET" });
  assertProviderOk(response);
  const data = await response.json().catch(() => null) as Record<string, unknown> | null;
  const rows = Array.isArray(data?.calls) ? data.calls
    : Array.isArray(data?.results) ? data.results
      : Array.isArray(data?.data) ? data.data : [];
  return rows.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const record = row as Record<string, unknown>;
    const callId = record.call_id ?? record.id;
    if (typeof callId !== "string") return [];
    return [{
      callId,
      status: typeof record.status === "string" ? record.status : undefined,
      startedAt: typeof record.started_at === "string" ? record.started_at
        : typeof record.created_at === "string" ? record.created_at : undefined,
      durationSeconds: typeof record.duration === "number" ? record.duration : undefined,
    }];
  });
}

/** Read the stored agent configuration back. Used by the config verifier. */
export async function getVaaniAgent(agentId: string): Promise<Record<string, unknown>> {
  const response = await vaaniFetch(`/agents/${encodeURIComponent(agentId)}`, { method: "GET" });
  assertProviderOk(response);
  const data = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!data || typeof data !== "object") throw new VaaniProviderError("provider-response-invalid", response.status);
  return data;
}

// ── Webhook events ──────────────────────────────────────────────────────────
// Vaani's webhooks carry no signature, so the body cannot be treated as
// evidence of anything. What arrives is used only as a hint that something has
// changed; any value Kavach acts on is re-read from the API with our own key.

export const VAANI_WEBHOOK_EVENTS = new Set([
  "call_started",
  "call_ringing",
  "user_picked_up_at",
  "call_rejected",
  "call_no_answer",
  "call_failed",
  "human_transfer_initiated",
  "human_transfer_successful",
  "human_transfer_failed",
  "call_ended",
  "call_postprocessing",
]);

export interface VaaniWebhookNote {
  event: string;
  /** Hashed room reference: enough to correlate, never the room itself. */
  room: string;
  receivedAt: number;
}

const webhookNotes: VaaniWebhookNote[] = [];
const MAX_WEBHOOK_NOTES = 200;

/**
 * Record that an event arrived, and nothing more. The transcript, summary,
 * entities and recording URL that ride along on `call_postprocessing` are
 * deliberately dropped: an unauthenticated POST must never be able to write a
 * victim's words into this service.
 */
export function noteVaaniWebhookEvent(event: string, room: unknown, now = Date.now()): VaaniWebhookNote | null {
  if (!VAANI_WEBHOOK_EVENTS.has(event)) return null;
  const note: VaaniWebhookNote = {
    event,
    room: typeof room === "string" && room ? opaqueIdentifier(room).slice(0, 16) : "unknown",
    receivedAt: now,
  };
  webhookNotes.push(note);
  if (webhookNotes.length > MAX_WEBHOOK_NOTES) webhookNotes.shift();
  return note;
}

export function readVaaniWebhookNotes(): readonly VaaniWebhookNote[] {
  return webhookNotes;
}
