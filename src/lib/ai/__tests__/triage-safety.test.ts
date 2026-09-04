import { describe, expect, it } from "vitest";
import { chooseIncidentAt, triageUrgency } from "../triage-safety";

const now = new Date("2026-09-04T12:00:00.000Z");

describe("triage timing safety", () => {
  it("preserves unknown time instead of substituting the request time", () => {
    expect(chooseIncidentAt(null, undefined, now)).toBeUndefined();
    expect(triageUrgency(true, undefined, now)).toBe("moderate");
  });

  it("rejects invalid and materially future model times", () => {
    expect(chooseIncidentAt("not-a-date", "2026-09-04T10:00:00Z", now)).toBe("2026-09-04T10:00:00.000Z");
    expect(chooseIncidentAt("2026-09-05T10:00:00Z", undefined, now)).toBeUndefined();
  });

  it("derives urgency from the accepted timestamp instead of model prose", () => {
    expect(triageUrgency(true, "2026-09-04T11:30:00.000Z", now)).toBe("critical");
    expect(triageUrgency(true, "2026-09-04T10:00:00.000Z", now)).toBe("high");
    expect(triageUrgency(false, "2026-09-04T11:30:00.000Z", now)).toBe("moderate");
  });
});
