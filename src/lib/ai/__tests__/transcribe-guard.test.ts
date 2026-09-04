import { beforeEach, describe, expect, it } from "vitest";
import {
  MAX_TRANSCRIPTION_REQUEST_BYTES,
  claimTranscriptionSlot,
  guardTranscriptionRequest,
  resetTranscriptionLimitForTests,
} from "../transcribe-guard";

function request(overrides: Record<string, string> = {}) {
  return new Request("https://kavach.test/api/ai/transcribe", {
    method: "POST",
    headers: {
      origin: "https://kavach.test",
      "content-type": "multipart/form-data; boundary=test",
      "content-length": "4096",
      ...overrides,
    },
  });
}

describe("transcription request guard", () => {
  beforeEach(resetTranscriptionLimitForTests);

  it("requires exact same-origin multipart requests with a bounded declared length", () => {
    expect(guardTranscriptionRequest(request())).toEqual({ ok: true });
    expect(guardTranscriptionRequest(request({ origin: "https://evil.test" }))).toMatchObject({ status: 403 });
    expect(guardTranscriptionRequest(request({ "content-length": "" }))).toMatchObject({ status: 411 });
    expect(guardTranscriptionRequest(request({ "content-length": String(MAX_TRANSCRIPTION_REQUEST_BYTES + 1) }))).toMatchObject({ status: 413 });
    expect(guardTranscriptionRequest(request({ "content-type": "application/octet-stream" }))).toMatchObject({ status: 415 });
  });

  it("limits repeated provider-cost requests in one process", () => {
    for (let index = 0; index < 5; index += 1) {
      expect(claimTranscriptionSlot("client", 1_000 + index).allowed).toBe(true);
    }
    expect(claimTranscriptionSlot("client", 2_000).allowed).toBe(false);
  });
});
