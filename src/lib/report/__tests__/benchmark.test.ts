import { describe, expect, it } from "vitest";

import { FIELDS } from "../schema";
import { benchmark, PORTAL_OTP_MINUTES } from "../benchmark";

/**
 * The comparison is a claim about the product, so it is tested like one.
 *
 * The point is not that the numbers are any particular value — they should move
 * when the schema moves. The point is that they stay *consistent* with the
 * schema, so the landing page cannot go on saying something the product stopped
 * doing three commits ago.
 */
describe("benchmark", () => {
  const b = benchmark();

  it("counts only what the schema actually says", () => {
    expect(b.portalRequired).toBe(FIELDS.filter((f) => f.ncrp === "required").length);
    expect(b.totalModelled).toBe(FIELDS.length);
  });

  it("cannot relax more of the portal's fields than the portal requires", () => {
    expect(b.relaxed).toBeLessThanOrEqual(b.portalRequired);
    expect(b.relaxedShare).toBeGreaterThanOrEqual(0);
    expect(b.relaxedShare).toBeLessThanOrEqual(100);
  });

  it("blocks on fewer fields than the portal does — the actual claim", () => {
    // If this ever fails, the claim on the landing page has become false and
    // the page must change, not this test.
    expect(b.kavachRequired).toBeLessThan(b.portalRequired);
  });

  it("still asks for something, so the comparison is honest", () => {
    // A "zero required fields" result would mean the schema had been gutted
    // rather than that the interview had got better.
    expect(b.kavachRequired).toBeGreaterThan(0);
  });

  it("documents the frictions it claims to have documented", () => {
    expect(b.documentedFrictions).toBeGreaterThanOrEqual(8);
  });

  it("keeps the quoted figure separate from the computed ones", () => {
    // Thirty minutes is MHA's number, not ours. It has no business being
    // derived from anything in this repository.
    expect(PORTAL_OTP_MINUTES).toBe(30);
  });
});
