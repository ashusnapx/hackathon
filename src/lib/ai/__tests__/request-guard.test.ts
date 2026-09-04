import { beforeEach, describe, expect, it } from "vitest";
import {
  MAX_AI_JSON_REQUEST_BYTES,
  MAX_AI_PROVIDER_REQUESTS_PER_CLIENT,
  claimAiProviderSlot,
  readAiJsonRequest,
  resetAiProviderLimitForTests,
} from "../request-guard";

function jsonRequest(
  body = '{"text":"hello"}',
  overrides: Record<string, string> = {},
) {
  return new Request("https://kavach.test/api/ai/triage", {
    method: "POST",
    headers: {
      origin: "https://kavach.test",
      "content-type": "application/json",
      "content-length": String(new TextEncoder().encode(body).byteLength),
      "x-real-ip": "203.0.113.8",
      ...overrides,
    },
    body,
  });
}

describe("AI JSON request guard", () => {
  beforeEach(resetAiProviderLimitForTests);

  it("accepts bounded, exact-origin JSON", async () => {
    await expect(readAiJsonRequest(jsonRequest())).resolves.toEqual({
      ok: true,
      value: { text: "hello" },
    });
  });

  it("rejects cross-origin, untyped, undeclared and invalid requests", async () => {
    await expect(readAiJsonRequest(jsonRequest(undefined, { origin: "https://evil.test" })))
      .resolves.toMatchObject({ status: 403 });
    await expect(readAiJsonRequest(jsonRequest(undefined, { "content-type": "text/plain" })))
      .resolves.toMatchObject({ status: 415 });
    await expect(readAiJsonRequest(jsonRequest(undefined, { "content-length": "" })))
      .resolves.toMatchObject({ status: 411 });
    await expect(readAiJsonRequest(jsonRequest("not-json")))
      .resolves.toMatchObject({ status: 400 });
  });

  it("rejects declared and actually streamed bodies over the limit", async () => {
    await expect(readAiJsonRequest(jsonRequest(undefined, {
      "content-length": String(MAX_AI_JSON_REQUEST_BYTES + 1),
    }))).resolves.toMatchObject({ status: 413 });

    const body = JSON.stringify({ text: "x".repeat(128) });
    await expect(readAiJsonRequest(jsonRequest(body, { "content-length": "2" }), 32))
      .resolves.toMatchObject({ status: 413 });
  });

  it("limits repeated provider-cost calls by client", () => {
    for (let index = 0; index < MAX_AI_PROVIDER_REQUESTS_PER_CLIENT; index += 1) {
      expect(claimAiProviderSlot(jsonRequest(), 1_000 + index).allowed).toBe(true);
    }
    expect(claimAiProviderSlot(jsonRequest(), 2_000).allowed).toBe(false);
  });
});
