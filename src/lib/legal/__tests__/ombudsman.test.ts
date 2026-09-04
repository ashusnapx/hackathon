import { describe, expect, it } from "vitest";
import {
  calculateRbiOmbudsmanWindow,
  RBI_OMBUDSMAN_2026,
} from "../ombudsman";

const at = (date: string) => new Date(`${date}T10:00:00+05:30`);

describe("RB-IOS 2026 filing window", () => {
  it("records the operative scheme and Clause 10 provenance", () => {
    const result = calculateRbiOmbudsmanWindow({
      regulatedEntityComplaintAt: at("2026-07-01"),
    });

    expect(result.source).toBe(RBI_OMBUDSMAN_2026);
    expect(result.source.effectiveOn).toBe("2026-07-01");
    expect(result.source.provisions).toEqual(
      expect.arrayContaining(["10(1)(f)", "10(1)(g)"]),
    );
  });

  it("opens after 30 days without a reply and closes 90 days later", () => {
    const result = calculateRbiOmbudsmanWindow({
      regulatedEntityComplaintAt: at("2026-07-05"),
    });

    expect(result.eligibleFrom).toEqual(at("2026-08-04"));
    expect(result.fileBy).toEqual(at("2026-11-02"));
    expect(result.eligibilityBasis).toBe("response_timeline_expired");
    expect(result.deadlineBasis).toBe("response_timeline_expiry");
  });

  it("opens immediately on an earlier dissatisfied reply", () => {
    const result = calculateRbiOmbudsmanWindow({
      regulatedEntityComplaintAt: at("2026-07-05"),
      dissatisfiedReplyAt: at("2026-07-15"),
      lastCommunicationAt: at("2026-07-15"),
    });

    expect(result.eligibleFrom).toEqual(at("2026-07-15"));
    expect(result.fileBy).toEqual(at("2026-11-02"));
    expect(result.eligibilityBasis).toBe("dissatisfied_reply");
  });

  it("honours a longer RBI, NPCI or card-network response timeline", () => {
    const result = calculateRbiOmbudsmanWindow({
      regulatedEntityComplaintAt: at("2026-07-05"),
      applicableResponseDays: 45,
    });

    expect(result.responseTimelineDays).toBe(45);
    expect(result.eligibleFrom).toEqual(at("2026-08-19"));
    expect(result.fileBy).toEqual(at("2026-11-17"));
  });

  it("extends the filing limit from a later regulated-entity communication", () => {
    const result = calculateRbiOmbudsmanWindow({
      regulatedEntityComplaintAt: at("2026-07-05"),
      lastCommunicationAt: at("2026-09-01"),
    });

    expect(result.fileBy).toEqual(at("2026-11-30"));
    expect(result.deadlineBasis).toBe("last_communication");
  });

  it("treats a dissatisfied reply as the last communication without duplicate input", () => {
    const result = calculateRbiOmbudsmanWindow({
      regulatedEntityComplaintAt: at("2026-07-05"),
      dissatisfiedReplyAt: at("2026-09-01"),
    });

    expect(result.eligibleFrom).toEqual(at("2026-08-04"));
    expect(result.fileBy).toEqual(at("2026-11-30"));
    expect(result.deadlineBasis).toBe("last_communication");
  });

  it("never shortens the ordinary wait below 30 days", () => {
    const result = calculateRbiOmbudsmanWindow({
      regulatedEntityComplaintAt: at("2026-07-05"),
      applicableResponseDays: 7,
    });

    expect(result.responseTimelineDays).toBe(30);
    expect(result.eligibleFrom).toEqual(at("2026-08-04"));
  });

  it("rejects invalid dates instead of manufacturing a deadline", () => {
    expect(() =>
      calculateRbiOmbudsmanWindow({
        regulatedEntityComplaintAt: new Date("not-a-date"),
      }),
    ).toThrow(RangeError);
  });
});
