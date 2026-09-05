import { describe, expect, it } from "vitest";

import { callAnalysis, callPollDelayMs, draftFromCall } from "../call-to-case";
import { mapVaaniCall } from "../from-vaani";
import { emptyIntake, type IntakeAnalysis } from "../interview";
import { EMPTY_ENTITIES } from "@/lib/case/types";
import demoCall from "@/lib/demo/call.json";

const model = (over: Partial<IntakeAnalysis["triage"]> = {}, entities = EMPTY_ENTITIES): IntakeAnalysis => ({
  triage: {
    categoryId: "financial-fraud",
    confidence: 0.7,
    applicableTracks: ["helpline", "ncrp"],
    urgency: "moderate",
    ...over,
  },
  entities,
  source: "openai",
});

describe("waiting for the provider to finish writing up a call", () => {
  it("backs off instead of hammering the endpoint", () => {
    expect(callPollDelayMs(0)).toBe(2_000);
    expect(callPollDelayMs(3)).toBeGreaterThan(callPollDelayMs(1));
    expect(callPollDelayMs(99)).toBe(15_000);
  });

  it("waits at least as long as the provider asked, and never absurdly long", () => {
    expect(callPollDelayMs(0, 10)).toBe(10_000);
    // A Retry-After shorter than our own backoff is not an invitation to poll faster.
    expect(callPollDelayMs(5, 1)).toBe(10_000);
    expect(callPollDelayMs(0, 600)).toBe(20_000);
    expect(callPollDelayMs(0, 0)).toBe(2_000);
  });
});

describe("reading a finished call", () => {
  it("uses the call alone when the provider named the fraud", () => {
    const analysis = callAnalysis(mapVaaniCall(demoCall.extracted as Record<string, unknown>));
    expect(analysis?.source).toBe("vaani");
    expect(analysis?.triage.categoryId).toBe("financial-fraud");
    expect(analysis?.triage.amount).toBe(10_000);
    expect(analysis?.triage.applicableTracks.length).toBeGreaterThan(0);
  });

  it("has nothing to open a case with when neither the call nor a model found a category", () => {
    expect(callAnalysis(mapVaaniCall({ amount_inr: 500 }))).toBeNull();
  });

  it("keeps what the caller said out loud over what the model re-derived", () => {
    const facts = mapVaaniCall({ amount_inr: 25_000, suspect_upi: "scammer@ybl" });
    const analysis = callAnalysis(facts, model({ amount: 2_500 }, { ...EMPTY_ENTITIES, upiIds: ["typo@ybl"] }));

    expect(analysis?.triage.amount).toBe(25_000);
    expect(analysis?.entities.upiIds).toEqual(["scammer@ybl", "typo@ybl"]);
    // The model supplied the category the call could not, so it is credited too.
    expect(analysis?.triage.categoryId).toBe("financial-fraud");
    expect(analysis?.source).toBe("vaani");
  });

  it("takes the model's reading whole when the call filled nothing", () => {
    const analysis = callAnalysis(mapVaaniCall({}), model());
    expect(analysis?.source).toBe("openai");
    expect(analysis?.triage.categoryId).toBe("financial-fraud");
  });

  it("never quietens a case that either reading thought was urgent", () => {
    const facts = mapVaaniCall({ money_moved: true, incident_timing: new Date().toISOString().slice(0, 10) });
    expect(callAnalysis(facts, model())?.triage.urgency).toBe("critical");
    expect(callAnalysis(mapVaaniCall({}), model({ urgency: "high" }))?.triage.urgency).toBe("high");
  });
});

describe("turning a finished call into the draft a case is built from", () => {
  const facts = mapVaaniCall(demoCall.extracted as Record<string, unknown>);
  const analysis = callAnalysis(facts)!;

  it("carries the call's own answers into the interview", () => {
    const draft = draftFromCall(emptyIntake("voice"), {
      facts,
      narrative: "I tried to pay ten thousand rupees by card and it failed.",
      analysis,
    });

    expect(draft.callerName).toBe("Pranav");
    expect(draft.moneyMoved).toBe("no");
    expect(draft.evidenceNote).toMatch(/[Ss]creenshot/);
    expect(draft.narrative).toMatch(/ten thousand rupees/);
    expect(draft.analysis?.source).toBe("vaani");
  });

  it("leaves every fact unconfirmed, because a machine heard them", () => {
    const draft = draftFromCall(emptyIntake("voice"), { facts, narrative: "anything", analysis });
    expect(draft.analysisConfirmed).toBe(false);
  });

  it("does not repeat an account that is already in the draft", () => {
    const spoken = "They asked me to pay again.";
    const started = { ...emptyIntake("voice"), narrative: spoken };
    expect(draftFromCall(started, { facts, narrative: spoken, analysis }).narrative).toBe(spoken);
  });

  it("keeps an answer the person gave on screen when the call did not cover it", () => {
    const started = { ...emptyIntake("voice"), bankName: "SBI", state: "Bihar" };
    const draft = draftFromCall(started, { facts, narrative: "", analysis });
    expect(draft.bankName).toBe("SBI");
    expect(draft.state).toBe("Bihar");
  });
});
