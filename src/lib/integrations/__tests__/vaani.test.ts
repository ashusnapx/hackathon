import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  consumeVaaniDispatchBudget,
  dispatchVaaniCall,
  finishVaaniDispatchWithoutResult,
  getVaaniLiveConfiguration,
  getVaaniTranscript,
  issueVaaniTranscriptToken,
  readSmallJson,
  readVaaniTranscriptToken,
  requestHasSameOrigin,
  reserveVaaniDispatch,
  resetVaaniPrototypeStateForTests,
  validateVaaniDispatchBody,
  vaaniDispatchFingerprint,
} from "../vaani";

const validBody = {
  contactNumber: "+919876543210",
  language: "hi",
  requestId: "018f47a6-9c2e-7b11-8e32-123456789abc",
  safeToSpeak: true,
  callbackConsent: true,
  transcriptionConsent: true,
  recordingConsent: true,
};

describe("Vaani fail-closed live configuration", () => {
  it("requires explicit enablement, credentials, reviewed agent match, and an allowlist", () => {
    const config = getVaaniLiveConfiguration({
      VAANI_API_KEY: "key",
      VAANI_AGENT_ID: "agent-a",
    });
    expect(config.ready).toBe(false);
    expect(config.problems).toEqual(expect.arrayContaining([
      "live-mode-disabled",
      "reviewed-agent-id-mismatch",
      "empty-or-invalid-test-number-allowlist",
    ]));
  });

  it("becomes ready only for an exactly reviewed agent and exact E.164 destinations", () => {
    const config = getVaaniLiveConfiguration({
      VAANI_LIVE_ENABLED: "true",
      VAANI_API_KEY: "key",
      VAANI_AGENT_ID: "agent-a",
      VAANI_REVIEWED_AGENT_ID: "agent-a",
      VAANI_ALLOWED_TEST_NUMBERS: "+919876543210,+14155550123",
    });
    expect(config.ready).toBe(true);
    expect([...config.allowedTestNumbers]).toEqual(["+919876543210", "+14155550123"]);
  });

  it("fails closed for malformed or duplicate allowlist entries", () => {
    for (const allowlist of ["9876543210", "+919876543210,+919876543210"]) {
      const config = getVaaniLiveConfiguration({
        VAANI_LIVE_ENABLED: "true",
        VAANI_API_KEY: "key",
        VAANI_AGENT_ID: "agent-a",
        VAANI_REVIEWED_AGENT_ID: "agent-a",
        VAANI_ALLOWED_TEST_NUMBERS: allowlist,
      });
      expect(config.ready).toBe(false);
      expect(config.allowedTestNumbers.size).toBe(0);
    }
  });
});

describe("Vaani dispatch validation", () => {
  it("accepts only the narrow consented schema", () => {
    expect(validateVaaniDispatchBody(validBody)).toEqual({ ok: true, value: validBody });
  });

  it.each([
    [{ ...validBody, contactNumber: "+91 98765 43210" }, "invalid-e164-number"],
    [{ ...validBody, language: "xx" }, "unsupported-language"],
    [{ ...validBody, requestId: "retry-me" }, "invalid-request-id"],
    [{ ...validBody, safeToSpeak: false }, "safe-to-speak-required"],
    [{ ...validBody, callbackConsent: false }, "callback-consent-required"],
    [{ ...validBody, transcriptionConsent: false }, "transcription-consent-required"],
    [{ ...validBody, recordingConsent: false }, "recording-consent-required"],
    [{ ...validBody, narrative: "sensitive story" }, "unexpected-field"],
    [{ ...validBody, name: "Victim name" }, "unexpected-field"],
    [{ ...validBody, caseReference: "case-123" }, "unexpected-field"],
  ])("rejects unsafe or unexpected input", (body, error) => {
    expect(validateVaaniDispatchBody(body)).toEqual({ ok: false, error });
  });

  it("requires exact same-origin POST context", () => {
    expect(requestHasSameOrigin(new Request("https://kavach.test/api/vaani/dispatch", {
      headers: { Origin: "https://kavach.test" },
    }))).toBe(true);
    expect(requestHasSameOrigin(new Request("https://kavach.test/api/vaani/dispatch", {
      headers: { Origin: "https://evil.test" },
    }))).toBe(false);
    expect(requestHasSameOrigin(new Request("https://kavach.test/api/vaani/dispatch"))).toBe(false);
  });

  it("bounds and parses JSON bodies", async () => {
    const good = await readSmallJson(new Request("https://kavach.test/api", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ hello: "world" }),
    }), 64);
    expect(good).toEqual({ ok: true, value: { hello: "world" } });

    const oversized = await readSmallJson(new Request("https://kavach.test/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "x".repeat(100) }),
    }), 32);
    expect(oversized).toEqual({ ok: false, error: "body-too-large" });
  });
});

describe("Vaani transcript capabilities", () => {
  beforeEach(resetVaaniPrototypeStateForTests);

  it("uses a random opaque token bound to one session", () => {
    const now = Date.parse("2026-09-04T10:00:00Z");
    const first = issueVaaniTranscriptToken("call_ABC123", "session-a", now);
    const second = issueVaaniTranscriptToken("call_ABC123", "session-a", now);

    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first).not.toContain("call_ABC123");
    expect(first).not.toBe(second);
    expect(readVaaniTranscriptToken(first, "session-a", now + 30 * 60 * 1000)).toBe("call_ABC123");
    expect(readVaaniTranscriptToken(first, "session-b", now)).toBeNull();
  });

  it("rejects expired, modified, and unknown capabilities", () => {
    const now = Date.parse("2026-09-04T10:00:00Z");
    const token = issueVaaniTranscriptToken("call_ABC123", "session-a", now);
    expect(readVaaniTranscriptToken(token, "session-a", now + 61 * 60 * 1000)).toBeNull();
    expect(readVaaniTranscriptToken(`${token.slice(0, -1)}x`, "session-a", now)).toBeNull();
    expect(readVaaniTranscriptToken("x".repeat(43), "session-a", now)).toBeNull();
  });
});

describe("Vaani non-durable dispatch guards", () => {
  beforeEach(resetVaaniPrototypeStateForTests);

  it("deduplicates a request and binds it to its original session and payload", () => {
    const fingerprint = vaaniDispatchFingerprint("+919876543210", "hi");
    expect(reserveVaaniDispatch(validBody.requestId, "session-a", fingerprint)).toEqual({ kind: "reserved" });
    expect(reserveVaaniDispatch(validBody.requestId, "session-a", fingerprint)).toEqual({ kind: "pending" });
    expect(reserveVaaniDispatch(validBody.requestId, "session-b", fingerprint)).toEqual({ kind: "session-mismatch" });
    expect(reserveVaaniDispatch(validBody.requestId, "session-a", `${fingerprint}changed`)).toEqual({ kind: "conflict" });
  });

  it("never treats an ambiguous provider result as permission to retry", () => {
    const fingerprint = vaaniDispatchFingerprint("+919876543210", "hi");
    reserveVaaniDispatch(validBody.requestId, "session-a", fingerprint);
    finishVaaniDispatchWithoutResult(validBody.requestId, "ambiguous");
    expect(reserveVaaniDispatch(validBody.requestId, "session-a", fingerprint)).toEqual({ kind: "ambiguous" });
  });

  it("enforces per-IP, per-number, and daily attempt ceilings", () => {
    const start = Date.parse("2026-09-04T00:00:00Z");
    expect(consumeVaaniDispatchBudget("ip-a", "+919000000001", start)).toEqual({ allowed: true });
    expect(consumeVaaniDispatchBudget("ip-a", "+919000000002", start + 1)).toEqual({ allowed: true });
    expect(consumeVaaniDispatchBudget("ip-a", "+919000000003", start + 2)).toEqual({ allowed: true });
    expect(consumeVaaniDispatchBudget("ip-a", "+919000000004", start + 3)).toMatchObject({
      allowed: false,
      reason: "ip-hourly-limit",
    });

    resetVaaniPrototypeStateForTests();
    expect(consumeVaaniDispatchBudget("ip-a", "+919000000001", start)).toEqual({ allowed: true });
    expect(consumeVaaniDispatchBudget("ip-b", "+919000000001", start + 1)).toEqual({ allowed: true });
    expect(consumeVaaniDispatchBudget("ip-c", "+919000000001", start + 2)).toMatchObject({
      allowed: false,
      reason: "number-daily-limit",
    });

    resetVaaniPrototypeStateForTests();
    expect(consumeVaaniDispatchBudget("ip-a", "+919000000001", start, { VAANI_DAILY_CALL_LIMIT: "2" })).toEqual({ allowed: true });
    expect(consumeVaaniDispatchBudget("ip-b", "+919000000002", start + 1, { VAANI_DAILY_CALL_LIMIT: "2" })).toEqual({ allowed: true });
    expect(consumeVaaniDispatchBudget("ip-c", "+919000000003", start + 2, { VAANI_DAILY_CALL_LIMIT: "2" })).toMatchObject({
      allowed: false,
      reason: "daily-circuit-open",
    });
  });
});

describe("Vaani provider boundary", () => {
  beforeEach(() => {
    vi.stubEnv("VAANI_LIVE_ENABLED", "true");
    vi.stubEnv("VAANI_API_KEY", "test-api-key");
    vi.stubEnv("VAANI_AGENT_ID", "reviewed-agent");
    vi.stubEnv("VAANI_REVIEWED_AGENT_ID", "reviewed-agent");
    vi.stubEnv("VAANI_ALLOWED_TEST_NUMBERS", "+919876543210");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("sends only fixed/minimum metadata and drops a provider caption URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      output: {
        call_id: "call_ABC123",
        agent_name: "Reviewed agent",
        live_captions_url: "wss://provider.example/sensitive-secret",
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await dispatchVaaniCall({ contactNumber: "+919876543210", language: "hi" });
    expect(result).toEqual({ callId: "call_ABC123", agentName: "Reviewed agent" });
    expect(result).not.toHaveProperty("liveCaptionsUrl");

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(request.body))).toEqual({
      agent_id: "reviewed-agent",
      medium: "telephony",
      contact_number: "+919876543210",
      name: "Kavach caller",
      metadata: { preferred_language: "hi", consent_source: "kavach-web" },
      dnd_check_skipped: false,
    });
  });

  it.each([
    ["not-json", "invalid JSON"],
    [JSON.stringify({ success: true, output: {} }), "missing call ID"],
    [JSON.stringify({ success: true, output: { call_id: "bad id" } }), "invalid call ID"],
  ])("treats a successful HTTP response with %s as dispatch-ambiguous", async (body) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })));

    await expect(dispatchVaaniCall({ contactNumber: "+919876543210", language: "hi" }))
      .rejects.toMatchObject({ kind: "dispatch-ambiguous", providerStatus: 200 });
  });

  it.each([
    [404, "transcript-not-ready"],
    [429, "provider-rate-limited"],
    [401, "provider-auth"],
    [503, "provider-unavailable"],
  ] as const)("maps transcript provider status %i to %s", async (status, kind) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", {
      status,
      headers: status === 429 ? { "Retry-After": "45" } : undefined,
    })));

    await expect(getVaaniTranscript("call_ABC123")).rejects.toMatchObject({ kind });
  });
});
