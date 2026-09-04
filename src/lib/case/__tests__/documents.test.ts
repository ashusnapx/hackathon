import { describe, expect, it } from "vitest";
import { documentInputFingerprint, parseDraftResponse } from "../documents";
import { newCase } from "../store";

describe("document request integrity", () => {
  it("changes the fingerprint when a drafting fact changes but not for generated output", () => {
    const base = newCase({ rawStatement: "Original account of the incident" });
    const factEdit = { ...base, rawStatement: "Corrected account of the incident" };
    const outputEdit = { ...base, docs: { ncrp: "A generated draft" } };
    expect(documentInputFingerprint(factEdit)).not.toBe(documentInputFingerprint(base));
    expect(documentInputFingerprint(outputEdit)).toBe(documentInputFingerprint(base));
  });

  it("accepts only a complete, typed response for the requested documents", () => {
    expect(parseDraftResponse(
      { source: "rules", docs: { ncrp: "Complaint", fir: "Police application" } },
      ["ncrp", "fir"],
    )).toEqual({ source: "rules", docs: { ncrp: "Complaint", fir: "Police application" } });
    expect(parseDraftResponse({ source: "rules", docs: { ncrp: "Complaint" } }, ["ncrp", "fir"])).toBeNull();
    expect(parseDraftResponse({ source: "unknown", docs: { ncrp: "Complaint" } }, ["ncrp"])).toBeNull();
    expect(parseDraftResponse({ source: "openai", docs: { ncrp: 42 } }, ["ncrp"])).toBeNull();
  });
});
