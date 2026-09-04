import { describe, expect, it } from "vitest";
import {
  emptyIntake,
  evidenceIdsFor,
  hasCompletedSafetyGate,
  hasCurrentSafetyAnswer,
  intakeProgress,
  needsFastFinancialAction,
  nextIntakeStep,
  timingEstimate,
  victimTurnsFromTranscript,
} from "../interview";

describe("adaptive intake interview", () => {
  it("opens narrative entry only after boundaries, danger and child-safety gates", () => {
    const base = emptyIntake();
    expect(hasCompletedSafetyGate(base)).toBe(false);
    expect(hasCompletedSafetyGate({
      ...base,
      acceptedBoundaries: true,
      safety: "danger",
      safetyCheckedAt: "2026-09-04T11:45:00.000Z",
      childContext: "adult-or-no-child",
    }, new Date("2026-09-04T12:00:00.000Z"))).toBe(false);
    expect(hasCompletedSafetyGate({
      ...base,
      acceptedBoundaries: true,
      safety: "safe",
      safetyCheckedAt: "2026-09-04T11:45:00.000Z",
      childContext: "self-minor",
    }, new Date("2026-09-04T12:00:00.000Z"))).toBe(false);
    expect(hasCompletedSafetyGate({
      ...base,
      acceptedBoundaries: true,
      safety: "danger",
      safetyCheckedAt: "2026-09-04T11:45:00.000Z",
      emergencyAcknowledged: true,
      childContext: "child-other",
      childSafetyAcknowledged: true,
    }, new Date("2026-09-04T12:00:00.000Z"))).toBe(true);
    expect(hasCurrentSafetyAnswer({
      ...base,
      safety: "safe",
      safetyCheckedAt: "2026-09-04T11:00:00.000Z",
    }, new Date("2026-09-04T12:00:00.000Z"))).toBe(false);
  });

  it("puts immediate safety before case questions", () => {
    const draft = { ...emptyIntake(), acceptedBoundaries: true, safety: "danger" as const, safetyCheckedAt: new Date().toISOString() };
    expect(nextIntakeStep(draft)).toBe("emergency");
  });

  it("only asks the time shortcut when money moved", () => {
    const base = { ...emptyIntake(), acceptedBoundaries: true, safety: "safe" as const, safetyCheckedAt: new Date().toISOString(), childContext: "adult-or-no-child" as const };
    expect(nextIntakeStep({ ...base, moneyMoved: "yes" })).toBe("timing");
    expect(nextIntakeStep({ ...base, moneyMoved: "no" })).toBe("story");
  });

  it("flags recent financial loss without inventing a recovery probability", () => {
    const draft = { ...emptyIntake(), moneyMoved: "yes" as const, incidentTiming: "last-hour" as const };
    expect(needsFastFinancialAction(draft)).toBe(true);
    expect(needsFastFinancialAction({ ...draft, incidentTiming: "older" })).toBe(false);
  });

  it("maps conversational evidence answers onto the case evidence graph", () => {
    expect(evidenceIdsFor(["transaction", "bank-message", "transaction", "none"])).toEqual([
      "txn_screenshot",
      "bank_statement",
      "sms_notification",
    ]);
  });

  it("does not pretend an unknown or older time is now", () => {
    const extracted = "2026-08-30T10:00:00.000Z";
    expect(timingEstimate("older", extracted)).toBe(extracted);
    expect(timingEstimate("unsure", undefined)).toBeUndefined();
    expect(timingEstimate("last-hour", undefined)).toBeUndefined();
    expect(timingEstimate("today", undefined)).toBeUndefined();
  });

  it("reports question progress rather than visited screens", () => {
    const p = intakeProgress({
      ...emptyIntake(),
      acceptedBoundaries: true,
      safety: "safe",
      safetyCheckedAt: new Date().toISOString(),
      childContext: "adult-or-no-child",
      moneyMoved: "no",
    });
    expect(p.answered).toBe(11); // includes age and a non-applicable child-safety gate
    expect(p.total).toBe(15);
    expect(p.percent).toBe(73);
  });

  it("asks legally material payment questions only for financial loss", () => {
    const base = {
      ...emptyIntake(),
      acceptedBoundaries: true,
      safety: "safe" as const,
      safetyCheckedAt: new Date().toISOString(),
      childContext: "adult-or-no-child" as const,
      moneyMoved: "yes" as const,
      incidentTiming: "today" as const,
      narrative: "An unknown debit appeared in my UPI account this morning.",
      analysis: {
        triage: { categoryId: "upi", confidence: 0.8, applicableTracks: [], urgency: "high" as const },
        entities: { upiIds: [], phones: [], accounts: [], refs: [], urls: [], emails: [], handles: [], apps: [] },
        source: "rules" as const,
      },
      analysisConfirmed: true,
    };

    expect(nextIntakeStep(base)).toBe("rbi-initiation");
    expect(nextIntakeStep({ ...base, transactionInitiation: "not-victim" })).toBe("rbi-credentials");
    expect(nextIntakeStep({
      ...base,
      transactionInitiation: "not-victim",
      credentialsShared: "no",
      suspectedBankFault: "unknown",
      bankReportTiming: "within_3_working_days",
    })).toBe("rbi-review");
    expect(nextIntakeStep({ ...base, transactionInitiation: "victim" })).toBe("rbi-review");
  });

  it("stops for child-safe handling before collecting the incident story", () => {
    const draft = {
      ...emptyIntake(),
      acceptedBoundaries: true,
      safety: "safe" as const,
      safetyCheckedAt: new Date().toISOString(),
      childContext: "child-other" as const,
    };
    expect(nextIntakeStep(draft)).toBe("child-safety");
    expect(nextIntakeStep({ ...draft, childSafetyAcknowledged: true })).toBe("money");
  });

  it("keeps victim speech and removes agent questions from a Vaani transcript", () => {
    const transcript = "AGENT: What happened? USER: I paid 5000 rupees. AGENT: When? USER: This morning.";
    expect(victimTurnsFromTranscript(transcript)).toBe("I paid 5000 rupees. This morning.");
  });
});
