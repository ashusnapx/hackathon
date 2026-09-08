import { describe, expect, it } from "vitest";

import { GOLDEN } from "../dataset";
import { format, meetsBar, score, type Prediction } from "../score";

/**
 * The scorer, checked.
 *
 * These numbers are what a release decision gets made on, so the arithmetic
 * cannot itself be untested. The case that matters most is the one balanced
 * accuracy exists to catch: a classifier that answers the majority class to
 * everything and scores well on plain accuracy.
 */

const perfect = (): Prediction[] =>
  GOLDEN.map((c) => ({ id: c.id, category: c.category, subcategory: c.subcategory, confidence: 0.9 }));

describe("score", () => {
  it("gives a perfect classifier full marks on every measure", () => {
    const r = score(perfect());
    expect(r.accuracy).toBe(1);
    expect(r.balancedAccuracy).toBe(1);
    expect(r.decisiveAccuracy).toBe(1);
    expect(r.subcategoryAccuracy).toBe(1);
    expect(r.confidentlyWrong).toBe(0);
    expect(r.misses).toHaveLength(0);
  });

  it("catches the classifier balanced accuracy exists to catch", () => {
    // Answers the majority class to everything. Plain accuracy flatters it;
    // balanced accuracy does not, because every other class has zero recall.
    const lazy = GOLDEN.map((c) => ({ id: c.id, category: "financial-fraud", confidence: 0.9 }));
    const r = score(lazy);

    expect(r.accuracy).toBeGreaterThan(0.3);
    expect(r.balancedAccuracy).toBeLessThan(r.accuracy);
    // Digital arrest is the case where being wrong costs the most.
    expect(r.perClass.find((c) => c.category === "digital-arrest")?.recall).toBe(0);
    expect(meetsBar(r).ok).toBe(false);
  });

  it("counts a wrong answer given confidently, apart from a wrong answer given tentatively", () => {
    const sure = GOLDEN.map((c) => ({ id: c.id, category: "other", confidence: 0.95 }));
    const unsure = GOLDEN.map((c) => ({ id: c.id, category: "other", confidence: 0.2 }));
    expect(score(sure).confidentlyWrong).toBeGreaterThan(score(unsure).confidentlyWrong);
    expect(score(unsure).confidentlyWrong).toBe(0);
  });

  it("treats a missing prediction as a miss rather than skipping it", () => {
    const r = score([]);
    expect(r.accuracy).toBe(0);
    expect(r.misses).toHaveLength(GOLDEN.length);
    expect(r.misses[0].got).toBe("(no prediction)");
  });

  it("scores the subcategory only where the category was already right", () => {
    // Right subcategory under the wrong category must not earn credit.
    const wrong = GOLDEN.map((c) => ({ id: c.id, category: "other", subcategory: c.subcategory, confidence: 0.5 }));
    expect(score(wrong).subcategoryAccuracy).toBe(0);
  });

  it("reports each origin separately, so a set tuned to itself is visible", () => {
    const r = score(perfect());
    const origins = r.perOrigin.map((o) => o.origin).sort();
    expect(origins).toContain("handwritten");
    expect(origins).toContain("near-miss");
    expect(r.perOrigin.every((o) => o.support > 0)).toBe(true);
  });

  it("keeps the ambiguous cases out of the decisive score", () => {
    // Wrong on everything ambiguous, right on everything else.
    const predictions = GOLDEN.map((c) => ({
      id: c.id,
      category: c.ambiguous ? "other" : c.category,
      confidence: 0.5,
    }));
    const r = score(predictions);
    expect(r.decisiveAccuracy).toBe(1);
    expect(r.accuracy).toBeLessThan(1);
  });
});

describe("meetsBar", () => {
  it("passes a perfect run and names what failed otherwise", () => {
    expect(meetsBar(score(perfect())).ok).toBe(true);
    const bad = meetsBar(score([]));
    expect(bad.ok).toBe(false);
    expect(bad.failures.join(" ")).toMatch(/balanced accuracy/);
  });
});

describe("the golden set itself", () => {
  it("has no duplicate ids, since scoring is keyed on them", () => {
    expect(new Set(GOLDEN.map((c) => c.id)).size).toBe(GOLDEN.length);
  });

  it("covers more than one category, or the score means nothing", () => {
    expect(new Set(GOLDEN.map((c) => c.category)).size).toBeGreaterThanOrEqual(5);
  });

  it("carries no phone number, UPI id or name that could identify anybody", () => {
    // A golden set of real complaints would be the most sensitive file here.
    for (const c of GOLDEN) {
      expect(c.text, c.id).not.toMatch(/\b[6-9]\d{9}\b/);
      expect(c.text, c.id).not.toMatch(/@ok(axis|hdfcbank|icici|sbi)/);
    }
  });

  it("formats a report a person can read", () => {
    const text = format(score(perfect()));
    expect(text).toMatch(/balanced accuracy/);
    expect(text).toMatch(/per class/);
  });
});
