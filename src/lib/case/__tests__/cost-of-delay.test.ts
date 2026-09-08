import { describe, expect, it } from "vitest";

import { costOfDelay } from "../cost-of-delay";
import type { TrackId } from "../types";

describe("what being late actually costs", () => {
  it("says nothing for actions that have no nationwide cutoff", () => {
    // Calling 1930 and filing on NCRP are urgent and carry no statutory
    // penalty. Inventing one would be the same failure the deadline engine
    // exists to avoid — a fake clock is worse than no clock.
    for (const id of ["helpline", "ncrp", "fir", "chakshu", "mrm", "legal-aid"] as TrackId[]) {
      expect(costOfDelay(id)).toBeNull();
    }
  });

  it("separates the citizen's forfeits from the bank's failures", () => {
    // A bank missing its own credit deadline has not cost the citizen
    // anything; it has handed them a ground. Rendering that as a red failure
    // would be both wrong and cruel.
    expect(costOfDelay("bank-notice")?.kind).toBe("forfeit");
    expect(costOfDelay("ombudsman")?.kind).toBe("forfeit");
    expect(costOfDelay("bank-credit")?.kind).toBe("entitlement");
    expect(costOfDelay("bank-resolution")?.kind).toBe("entitlement");
  });

  it("picks the bank-notice ladder from when the money moved", () => {
    // Not from today. In the weeks either side of 1 January 2027 these two are
    // different deadlines — three working days versus five calendar days — and
    // reading the current date would tell half of all users the wrong one.
    expect(costOfDelay("bank-notice", "2026-12-31T10:00:00.000Z")?.bodyKey)
      .toBe("delay.bankNotice2017");
    expect(costOfDelay("bank-notice", "2027-01-01T10:00:00.000Z")?.bodyKey)
      .toBe("delay.bankNotice2026");
  });

  it("falls back to the framework in force when no incident date is known", () => {
    expect(costOfDelay("bank-notice")?.bodyKey).toBe("delay.bankNotice2017");
    expect(costOfDelay("bank-notice", "not-a-date")?.bodyKey).toBe("delay.bankNotice2017");
  });

  it("cites a named instrument for every claim it makes", () => {
    // The whole point is that a person can check it. A consequence with no
    // source is an assertion, and this product does not make those.
    for (const id of ["bank-notice", "ombudsman", "bank-credit", "bank-resolution"] as TrackId[]) {
      const cost = costOfDelay(id);
      expect(cost?.sourceTitle.length).toBeGreaterThan(10);
      expect(cost?.sourceUrl).toMatch(/^https:\/\//);
    }
  });
});
