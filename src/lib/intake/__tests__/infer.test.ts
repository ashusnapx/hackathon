import { describe, expect, it } from "vitest";

import {
  childFromAnalysis,
  draftFromStory,
  moneyFromAnalysis,
  safetyFromAnalysis,
  timingFromIncident,
} from "../infer";
import type { IntakeAnalysis } from "../interview";
import { EMPTY_ENTITIES } from "@/lib/case/types";

const NOW = Date.parse("2026-09-06T15:00:00.000Z");

const analysis = (over: Partial<IntakeAnalysis["triage"]> = {}): IntakeAnalysis => ({
  source: "openai",
  entities: { ...EMPTY_ENTITIES },
  triage: {
    categoryId: "financial-fraud",
    confidence: 0.8,
    applicableTracks: ["helpline", "ncrp", "bank-notice", "fir"],
    urgency: "high",
    ...over,
  },
});

describe("the bracket a time falls into", () => {
  it("reads a fresh transaction as the hour that matters", () => {
    expect(timingFromIncident("2026-09-06T14:30:00.000Z", NOW)).toBe("last-hour");
  });

  it("separates earlier today from before today", () => {
    expect(timingFromIncident("2026-09-06T09:00:00.000Z", NOW)).toBe("today");
    expect(timingFromIncident("2026-09-04T09:00:00.000Z", NOW)).toBe("older");
  });

  it("asks rather than inventing when the story had no time in it", () => {
    expect(timingFromIncident(undefined, NOW)).toBeUndefined();
    expect(timingFromIncident("not a date", NOW)).toBeUndefined();
  });

  it("refuses a timestamp from the future, which is a model error not a fact", () => {
    expect(timingFromIncident("2026-09-08T09:00:00.000Z", NOW)).toBeUndefined();
  });
});

describe("whether money left", () => {
  it("takes an extracted amount as the answer", () => {
    expect(moneyFromAnalysis(analysis({ amount: 47_500 }))).toBe("yes");
  });

  it("still asks when the fraud is financial but no amount was said", () => {
    // The money may have moved and gone unmentioned; assuming "no" here would
    // quietly drop somebody out of the bank and RBI routes entirely.
    expect(moneyFromAnalysis(analysis())).toBeUndefined();
  });

  it("answers for a category that has no money in it", () => {
    expect(moneyFromAnalysis(analysis({
      categoryId: "social-media",
      applicableTracks: ["ncrp", "fir", "chakshu", "legal-aid"],
    }))).toBe("no");
  });
});

describe("who needs a phone number in front of them", () => {
  it("flags the frauds that arrive with a threat", () => {
    expect(safetyFromAnalysis(analysis({ categoryId: "digital-arrest" }))).toBe("danger");
    expect(safetyFromAnalysis(analysis({ categoryId: "women-child", subcategoryId: "sextortion" }))).toBe("danger");
    expect(safetyFromAnalysis(analysis({ subcategoryId: "loan" }))).toBe("danger");
  });

  it("does not cry wolf on an ordinary payment fraud", () => {
    expect(safetyFromAnalysis(analysis({ subcategoryId: "upi" }))).toBe("safe");
  });

  it("puts a child case on the child route, and says so when it cannot tell", () => {
    expect(childFromAnalysis(analysis({ categoryId: "women-child", subcategoryId: "csam" }))).toBe("child-other");
    expect(childFromAnalysis(analysis({ categoryId: "women-child" }))).toBe("unknown");
    expect(childFromAnalysis(analysis({ subcategoryId: "upi" }))).toBe("adult-or-no-child");
  });
});

describe("the draft one box produces", () => {
  const story = "  A caller said he was from my bank and ₹47,500 left my account this morning.  ";

  it("carries the story and everything read out of it", () => {
    const draft = draftFromStory(story, analysis({ amount: 47_500, incidentAt: "2026-09-06T09:00:00.000Z" }), new Date(NOW));
    expect(draft.narrative).toBe(story.trim());
    expect(draft.moneyMoved).toBe("yes");
    expect(draft.incidentTiming).toBe("today");
    expect(draft.acceptedBoundaries).toBe(true);
    expect(draft.safety).toBe("safe");
    expect(draft.childContext).toBe("adult-or-no-child");
  });

  it("never marks the facts confirmed — that is still the person's to do", () => {
    const draft = draftFromStory(story, analysis({ amount: 100 }), new Date(NOW));
    expect(draft.analysisConfirmed).toBe(false);
  });

  it("leaves a flagged case to stop on the emergency card rather than waving it through", () => {
    const draft = draftFromStory("They are threatening to leak a video.", analysis({
      categoryId: "women-child", subcategoryId: "sextortion",
    }), new Date(NOW));
    expect(draft.safety).toBe("danger");
    expect(draft.emergencyAcknowledged).toBeUndefined();
    expect(draft.childSafetyAcknowledged).toBeUndefined();
  });

  it("stamps the safety check now, because now is when the numbers were shown", () => {
    const draft = draftFromStory(story, analysis({ amount: 1 }), new Date(NOW));
    expect(draft.safetyCheckedAt).toBe(new Date(NOW).toISOString());
  });
});
