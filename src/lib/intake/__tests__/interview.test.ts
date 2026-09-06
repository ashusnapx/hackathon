import { describe, expect, it } from "vitest";
import { DETAIL_QUESTIONS } from "../details";
import {
  emptyIntake,
  evidenceIdsFor,
  freshStartDraft,
  hasCompletedSafetyGate,
  hasCurrentSafetyAnswer,
  intakeProgress,
  needsFastFinancialAction,
  nextIntakeStep,
  timingEstimate,
  victimTurnsFromTranscript,
  type IntakeDraft,
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

  it("does not make anybody file their own fraud into a time bucket", () => {
    // "Roughly when?" is our filing problem, not a thing a person thinks in.
    // Both answers go straight on to the introductions; the exact timestamp is
    // asked for later, where the bank's SMS can be quoted back at it.
    const base = { ...emptyIntake(), acceptedBoundaries: true, safety: "safe" as const, safetyCheckedAt: new Date().toISOString(), childContext: "adult-or-no-child" as const };
    expect(nextIntakeStep({ ...base, moneyMoved: "yes" })).toBe("name");
    expect(nextIntakeStep({ ...base, moneyMoved: "no" })).toBe("name");
    // And the account of what happened comes after the introductions: a name,
    // then the contact details every document needs.
    expect(nextIntakeStep({ ...base, moneyMoved: "no", callerName: "Meera" })).toBe("details");
    expect(nextIntakeStep({
      ...base,
      moneyMoved: "no",
      callerName: "Meera",
      detailsAsked: ["phone", "email", "address"],
    })).toBe("story");
  });

  it("learns a name before asking anybody to describe their worst hour", () => {
    const base = { ...emptyIntake(), acceptedBoundaries: true, safety: "safe" as const, safetyCheckedAt: new Date().toISOString(), childContext: "adult-or-no-child" as const, moneyMoved: "no" as const };
    expect(nextIntakeStep(base)).toBe("name");
    // Declining is an answer, and it is not asked twice.
    expect(nextIntakeStep({ ...base, detailsAsked: ["name"] })).toBe("details");
    expect(nextIntakeStep({
      ...base,
      detailsAsked: ["name", "phone", "email", "address"],
    })).toBe("story");
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
    expect(p.answered).toBe(10); // includes age and a non-applicable child-safety gate
    // Sixteen: the time bucket is no longer one of them — it is worked out from
    // the timestamp the follow-ups ask for.
    expect(p.total).toBe(16);
    expect(p.percent).toBe(63);
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
      // The introduction and the follow-ups that fill the case file come first
      // and are all skipped here, so this is about the RBI branch and nothing
      // else.
      detailsAsked: DETAIL_QUESTIONS.map((question) => question.id),
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

describe("keeping only what the caller said", () => {
  it("drops the agent, the timestamps and the interrupted flags", async () => {
    const { victimTurnsFromTranscript } = await import("../interview");
    const raw = [
      "[04:33:49] AGENT: Hi, how can I help?",
      " interrupted: False",
      "",
      "[04:33:55] USER: मेरे साथ एक UPI fraud हुआ है. दस हज़ार रुपए का.",
      " interrupted: False",
      "",
      "[04:34:04] AGENT: यह सुनकर बहुत दुख हुआ।",
      " interrupted: True",
      "",
      "[04:35:09] USER: Paytm app से और bank था HDFC.",
      " interrupted: False",
    ].join("\n");

    const kept = victimTurnsFromTranscript(raw);
    expect(kept).toContain("UPI fraud");
    expect(kept).toContain("Paytm app से और bank था HDFC.");
    expect(kept).not.toContain("how can I help");
    expect(kept).not.toContain("interrupted");
    expect(kept).not.toMatch(/\[\d{1,2}:\d{2}/);
  });
});

describe("pressing Start", () => {
  it("carries nothing of the last report into the next one", () => {
    const abandoned: IntakeDraft = {
      ...emptyIntake("web"),
      narrative: "I lost twelve thousand rupees to a fake delivery link.",
      callerName: "Someone Else",
      bankName: "HDFC",
      state: "Karnataka",
      moneyMoved: "yes",
      analysisConfirmed: true,
      evidence: ["transaction"],
      files: [{ name: "screenshot.png", size: 1, type: "image/png" }],
    };

    const fresh = freshStartDraft("whatsapp", { safety: "safe", childContext: "adult-or-no-child" });

    // Nothing from the abandoned interview may reappear: the next person to
    // pick up this phone must not be handed the last one's fraud.
    for (const key of Object.keys(abandoned) as (keyof IntakeDraft)[]) {
      if (["version", "channel", "acceptedBoundaries", "analysisConfirmed", "rbiAssessmentReviewed", "routingAnswered", "narrative", "files"].includes(key)) continue;
      expect(fresh[key]).toBeUndefined();
    }
    expect(fresh.narrative).toBe("");
    expect(fresh.files).toEqual([]);
    expect(fresh.channel).toBe("whatsapp");
  });

  it("keeps the two answers the front door just asked for", () => {
    const fresh = freshStartDraft("voice", { safety: "safe", childContext: "adult-or-no-child" });
    expect(fresh.acceptedBoundaries).toBe(true);
    expect(fresh.safety).toBe("safe");
    expect(fresh.childContext).toBe("adult-or-no-child");
    expect(hasCompletedSafetyGate(fresh)).toBe(true);
  });

  it("acknowledges the emergency route for anyone who did not answer safe", () => {
    expect(freshStartDraft("voice", { safety: "danger", childContext: "adult-or-no-child" }).emergencyAcknowledged).toBe(true);
    expect(freshStartDraft("voice", { safety: "safe", childContext: "child-other" }).childSafetyAcknowledged).toBe(true);
    expect(freshStartDraft("voice", { safety: "safe", childContext: "adult-or-no-child" }).emergencyAcknowledged).toBeUndefined();
  });
});
