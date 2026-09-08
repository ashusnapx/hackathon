import { describe, expect, it } from "vitest";

import {
  ADVISORY_STALE_DAYS,
  advisoryAgeDays,
  baselineBoard,
  BASELINE_ADVISORIES,
  isAdvisory,
  isAdvisoryBoardStale,
  type Advisory,
} from "../advisories";

const VALID: Advisory = {
  id: "i4c-fake-courier",
  title: "Parcel held by customs",
  summary: "A recorded call claims a courier in your name is being held.",
  tell: "A courier problem never routes you to a police officer wanting a payment.",
  severity: "high",
  sourceName: "I4C",
  sourceUrl: "https://cybercrime.gov.in",
  publishedAt: "2026-01-15",
};

describe("the advisory board the Check page ships with", () => {
  it("carries a source and a date on every entry", () => {
    // An unattributed fraud warning is the shape of the thing it warns about.
    for (const advisory of BASELINE_ADVISORIES) {
      expect(advisory.sourceName.length).toBeGreaterThan(0);
      expect(advisory.sourceUrl).toMatch(/^https:\/\//);
      expect(advisory.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("uses stable ids, so a nightly refresh updates instead of duplicating", () => {
    const ids = BASELINE_ADVISORIES.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("says it is the shipped set rather than claiming to be live", () => {
    expect(baselineBoard().origin).toBe("baseline");
    expect(baselineBoard().advisories.length).toBeGreaterThan(0);
  });
});

describe("saying how old the board is", () => {
  const board = { advisories: [VALID], refreshedAt: "2026-09-01", origin: "live" as const };

  it("counts whole days since the set was last confirmed", () => {
    expect(advisoryAgeDays(board, new Date("2026-09-01T12:00:00Z"))).toBe(0);
    expect(advisoryAgeDays(board, new Date("2026-09-04T00:00:00Z"))).toBe(3);
  });

  it("never reports a negative age for a date in the future", () => {
    expect(advisoryAgeDays(board, new Date("2026-08-20T00:00:00Z"))).toBe(0);
  });

  it("treats an unparseable date as infinitely old rather than as fresh", () => {
    // Failing open here would label a board of unknown age as current.
    const broken = { ...board, refreshedAt: "not-a-date" };
    expect(advisoryAgeDays(broken)).toBe(Number.POSITIVE_INFINITY);
    expect(isAdvisoryBoardStale(broken)).toBe(true);
  });

  it("goes stale a week after its last confirmation", () => {
    const day = (n: number) => new Date(`2026-09-0${n}T00:00:00Z`);
    expect(isAdvisoryBoardStale(board, day(1))).toBe(false);
    expect(
      isAdvisoryBoardStale(board, new Date(Date.parse("2026-09-01") + ADVISORY_STALE_DAYS * 86_400_000)),
    ).toBe(false);
    expect(
      isAdvisoryBoardStale(board, new Date(Date.parse("2026-09-01") + (ADVISORY_STALE_DAYS + 1) * 86_400_000)),
    ).toBe(true);
  });
});

describe("what is allowed to render as an advisory", () => {
  it("accepts a well-formed one", () => {
    expect(isAdvisory(VALID)).toBe(true);
  });

  it("refuses one whose source is not an https link", () => {
    // Displayed as a citation next to official guidance, so it has to be one.
    expect(isAdvisory({ ...VALID, sourceUrl: "http://cybercrime.gov.in" })).toBe(false);
    expect(isAdvisory({ ...VALID, sourceUrl: "javascript:alert(1)" })).toBe(false);
    expect(isAdvisory({ ...VALID, sourceUrl: "" })).toBe(false);
  });

  it("refuses one with no date, an invented severity, or empty text", () => {
    expect(isAdvisory({ ...VALID, publishedAt: "soon" })).toBe(false);
    expect(isAdvisory({ ...VALID, severity: "critical" })).toBe(false);
    expect(isAdvisory({ ...VALID, tell: "" })).toBe(false);
    expect(isAdvisory({ ...VALID, title: "" })).toBe(false);
  });

  it("refuses text long enough to be a page rather than an advisory", () => {
    expect(isAdvisory({ ...VALID, summary: "x".repeat(801) })).toBe(false);
    expect(isAdvisory({ ...VALID, id: "x".repeat(65) })).toBe(false);
  });

  it("refuses anything that is not an object", () => {
    for (const value of [null, undefined, "advisory", 7, [VALID]]) {
      expect(isAdvisory(value)).toBe(false);
    }
  });
});
