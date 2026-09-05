import { describe, expect, it } from "vitest";

import { CASE_ID_PATTERN, readCaseCredentials, readCaseDocument } from "../case-request";
import { CASE_KEY_PATTERN, caseKeyHash, newCaseKey } from "@/lib/case/key";

const KEY = "a".repeat(43);

describe("what a case route will accept", () => {
  it("takes a case id and a key of the right shape", () => {
    expect(readCaseCredentials({ id: "demo-vaani-call", key: KEY })).toEqual({
      id: "demo-vaani-call",
      key: KEY,
    });
  });

  it("refuses anything that is not one", () => {
    expect(readCaseCredentials({ id: "short", key: KEY })).toBeNull();
    expect(readCaseCredentials({ id: "a".repeat(65), key: KEY })).toBeNull();
    // A path separator in an id is how a lookup becomes something else.
    expect(readCaseCredentials({ id: "../../etc/passwd", key: KEY })).toBeNull();
    expect(readCaseCredentials({ id: "valid-case-id", key: "too-short" })).toBeNull();
    expect(readCaseCredentials({ id: "valid-case-id" })).toBeNull();
    expect(readCaseCredentials({ id: 12345, key: KEY })).toBeNull();
  });

  it("will not store a document addressed to a different case", () => {
    const body = { id: "case-one-1234", key: KEY, case: { id: "case-two-1234", ref: "KVC-AAAA-BBBB" } };
    expect(readCaseDocument(body, "case-one-1234")).toBeNull();
  });

  it("requires a document that looks like a case", () => {
    const id = "case-one-1234";
    expect(readCaseDocument({ case: { id, ref: "KVC-AAAA-BBBB" } }, id)?.ref).toBe("KVC-AAAA-BBBB");
    expect(readCaseDocument({ case: { id } }, id)).toBeNull();
    expect(readCaseDocument({ case: [{ id }] }, id)).toBeNull();
    expect(readCaseDocument({ case: "a case, honestly" }, id)).toBeNull();
    expect(readCaseDocument({}, id)).toBeNull();
  });
});

describe("the key that stands in for an account", () => {
  it("is long enough that guessing is not a strategy", () => {
    const key = newCaseKey();
    expect(CASE_KEY_PATTERN.test(key)).toBe(true);
    // 32 bytes, base64url, no padding.
    expect(key).toHaveLength(43);
    expect(new Set([...Array(64)].map(newCaseKey)).size).toBe(64);
  });

  it("reaches the database only as a hash", async () => {
    const key = newCaseKey();
    const hash = await caseKeyHash(key);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(key);
    expect(await caseKeyHash(key)).toBe(hash);
    expect(await caseKeyHash(newCaseKey())).not.toBe(hash);
  });

  it("accepts the ids this app actually makes", () => {
    expect(CASE_ID_PATTERN.test(crypto.randomUUID())).toBe(true);
    expect(CASE_ID_PATTERN.test("demo-vaani-call")).toBe(true);
  });
});
