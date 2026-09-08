import { describe, expect, it } from "vitest";

import { CASE_REF_PATTERN, isCaseRef } from "../store";
import { DEMO_CASE_ID, DEMO_CASE_PATH } from "@/lib/demo/id";

describe("the case reference in the address bar", () => {
  it("recognises a reference, however it was typed back", () => {
    expect(isCaseRef("KVC-5DLK-3XPL")).toBe(true);
    expect(isCaseRef("kvc-5dlk-3xpl")).toBe(true);
    expect(isCaseRef("  KVC-5DLK-3XPL  ")).toBe(true);
  });

  it("does not mistake a uuid or the sample for a reference", () => {
    // Both must fall through untouched: a uuid is what a shared link carries,
    // and the sample's path is the one the proxy allowlists.
    expect(isCaseRef("ddf24f85-049f-4c49-95ed-b85eff21adc4")).toBe(false);
    expect(isCaseRef(DEMO_CASE_ID)).toBe(false);
    expect(DEMO_CASE_PATH).toBe(`/case/${DEMO_CASE_ID}`);
  });

  it("excludes the glyphs people confuse when copying by hand", () => {
    // No I, O, 0 or 1 — this gets read down a phone line to an officer.
    for (const bad of ["KVC-I234-ABCD", "KVC-O234-ABCD", "KVC-0234-ABCD", "KVC-1234-ABCD"]) {
      expect(CASE_REF_PATTERN.test(bad)).toBe(false);
    }
  });

  it("rejects a reference of the wrong shape", () => {
    expect(isCaseRef("KVC-5DLK")).toBe(false);
    expect(isCaseRef("KVC-5DLK-3XPL-EXTRA")).toBe(false);
    expect(isCaseRef("ABC-5DLK-3XPL")).toBe(false);
  });
});
