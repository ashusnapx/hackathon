import { describe, expect, it } from "vitest";
import { newCase } from "@/lib/case/store";
import { assessRbiEligibility, type RbiInitiation } from "@/lib/legal/rbi";
import { modelDraftsContradictPaymentAnswer } from "../document-safety";

function caseWithInitiation(initiation: RbiInitiation) {
  const input = {
    initiation,
    credentialsShared: "unknown" as const,
    suspectedBankFault: "unknown" as const,
    reportTiming: "unknown" as const,
  };
  return newCase({
    amount: 5_000,
    legal: { rbi: { input, assessment: assessRbiEligibility(input), assessedAt: "2026-09-04T10:00:00.000Z" } },
  });
}

describe("model document payment assertions", () => {
  it("rejects an unauthorised assertion for a victim-approved payment", () => {
    expect(modelDraftsContradictPaymentAnswer(caseWithInitiation("victim"), {
      bank: "The transfer was not authorised by me.",
    })).toBe(true);
  });

  it("rejects an approval assertion for a transaction the victim did not initiate", () => {
    expect(modelDraftsContradictPaymentAnswer(caseWithInitiation("not-victim"), {
      fir: "I personally approved this transaction.",
    })).toBe(true);
  });

  it("allows neutral fact-checking language", () => {
    expect(modelDraftsContradictPaymentAnswer(caseWithInitiation("unknown"), {
      bank: "Please determine whether I initiated or approved this transaction.",
    })).toBe(false);
  });
});
