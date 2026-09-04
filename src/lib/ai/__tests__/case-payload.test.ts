import { describe, expect, it } from "vitest";
import { newCase } from "@/lib/case/store";
import { isCaseFilePayload } from "../case-payload";

describe("AI case payload validation", () => {
  it("accepts a real case and rejects malformed nested data", () => {
    const valid = newCase();
    expect(isCaseFilePayload(valid)).toBe(true);
    expect(isCaseFilePayload({ ...valid, files: [{ name: "x", size: "large", type: "x" }] }))
      .toBe(false);
    expect(isCaseFilePayload({ ...valid, suspect: { phones: null } })).toBe(false);
  });
});
