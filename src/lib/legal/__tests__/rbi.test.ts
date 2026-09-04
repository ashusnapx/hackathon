import { describe, expect, it } from "vitest";
import { ruleBankLetter, ruleOmbudsman } from "@/lib/ai/fallback";
import type { CaseFile } from "@/lib/case/types";
import {
  assessRbiEligibility,
  RBI_2017_CIRCULAR,
  type RbiEligibilityInput,
} from "../rbi";

const thirdPartyWithinThreeDays: RbiEligibilityInput = {
  initiation: "not-victim",
  credentialsShared: "no",
  suspectedBankFault: "no",
  reportTiming: "within_3_working_days",
};

function makeCase(overrides: Partial<CaseFile> = {}): CaseFile {
  return {
    id: "case-1",
    ref: "KVC-TEST-0001",
    createdAt: "2026-09-04T08:00:00.000Z",
    language: "en",
    rawStatement: "I am disputing a payment after a fraud incident.",
    triage: null,
    entities: {
      upiIds: [],
      phones: [],
      accounts: [],
      refs: ["UTR-123"],
      urls: [],
      emails: [],
      handles: [],
      apps: [],
    },
    incidentAt: "2026-09-03T08:00:00.000Z",
    amount: 25_000,
    txns: [],
    victim: { name: "Asha", phone: "9000000000" },
    bank: { name: "Example Bank", last4: "1234" },
    suspect: { phones: [], upiIds: [], accounts: [], urls: [], handles: [] },
    evidenceText: "",
    files: [],
    tracks: [],
    docs: {},
    events: [],
    ...overrides,
  };
}

describe("assessRbiEligibility", () => {
  it("uses the official 2017 circular and preserves paragraph provenance", () => {
    const result = assessRbiEligibility(thirdPartyWithinThreeDays);

    expect(result.source).toBe(RBI_2017_CIRCULAR);
    expect(result.status).toBe("eligible");
    expect(result.protection).toBe("zero_liability");
    expect(result.reasons).toHaveLength(result.provenance.length);
    expect(result.provenance.flatMap((item) => item.sourceParagraphs)).toEqual(
      expect.arrayContaining(["6(ii)", "8", "12"]),
    );
  });

  it("does not infer protection from a cyber-fraud category", () => {
    const victimApproved = {
      ...thirdPartyWithinThreeDays,
      initiation: "victim" as const,
      categoryId: "financial-fraud",
    };

    const result = assessRbiEligibility(victimApproved);

    expect(result.status).toBe("not_eligible");
    expect(result.protection).toBe("not_applicable");
    expect(result.reasons.join(" ")).toContain("initiated or approved this payment");
  });

  it("keeps an unknown initiation answer unknown", () => {
    const result = assessRbiEligibility({
      ...thirdPartyWithinThreeDays,
      initiation: "unknown",
    });

    expect(result.status).toBe("unknown");
    expect(result.protection).toBe("undetermined");
    expect(result.missingAnswers).toContain("initiation");
  });

  it("distinguishes the four-to-seven-day limited-liability route from zero liability", () => {
    const result = assessRbiEligibility({
      ...thirdPartyWithinThreeDays,
      reportTiming: "four_to_seven_working_days",
    });

    expect(result.status).toBe("eligible");
    expect(result.protection).toBe("limited_liability");
    expect(result.reasons.join(" ")).toContain("not zero liability");
  });

  it("leaves a late report to bank policy rather than promising a cap", () => {
    const result = assessRbiEligibility({
      ...thirdPartyWithinThreeDays,
      reportTiming: "after_7_working_days",
    });

    expect(result.status).toBe("possibly_eligible");
    expect(result.protection).toBe("bank_policy");
    expect(result.reasons.join(" ")).toContain("does not guarantee zero liability");
  });

  it("does not make a negligence finding when credential sharing may have caused the loss", () => {
    const result = assessRbiEligibility({
      ...thirdPartyWithinThreeDays,
      credentialsShared: "yes",
    });

    expect(result.status).toBe("possibly_eligible");
    expect(result.protection).toBe("post_report_loss_only");
    expect(result.reasons.join(" ")).toContain("loss caused by customer negligence");
    expect(result.reasons.join(" ")).toContain("burden of proving customer liability");
  });

  it("keeps suspected bank fault separate from an established finding", () => {
    const result = assessRbiEligibility({
      ...thirdPartyWithinThreeDays,
      credentialsShared: "yes",
      suspectedBankFault: "yes",
    });

    expect(result.status).toBe("possibly_eligible");
    expect(result.protection).toBe("undetermined");
    expect(result.reasons.join(" ")).toContain("If the bank's");
  });

  it("asks for missing credential facts instead of guessing", () => {
    const result = assessRbiEligibility({
      ...thirdPartyWithinThreeDays,
      credentialsShared: "unknown",
    });

    expect(result.status).toBe("unknown");
    expect(result.missingAnswers).toContain("credentialsShared");
  });

  it("prioritises immediate reporting when the bank has not been notified", () => {
    const result = assessRbiEligibility({
      ...thirdPartyWithinThreeDays,
      reportTiming: "not_reported",
    });

    expect(result.status).toBe("unknown");
    expect(result.reasons.join(" ")).toContain(
      "Report the disputed transaction to the bank immediately",
    );
    expect(result.provenance[1]?.sourceParagraphs).toContain("5");
  });

  it("does not collapse unknown bank fault into the four-to-seven-day cap", () => {
    const result = assessRbiEligibility({
      ...thirdPartyWithinThreeDays,
      suspectedBankFault: "unknown",
      reportTiming: "four_to_seven_working_days",
    });

    expect(result.status).toBe("possibly_eligible");
    expect(result.protection).toBe("undetermined");
    expect(result.missingAnswers).toContain("suspectedBankFault");
  });
});

describe("RBI document fallback safety", () => {
  it("leaves unverified liability and reporting facts as prompts", () => {
    const caseFile = makeCase();
    const bankLetter = ruleBankLetter(caseFile);
    const ombudsman = ruleOmbudsman(caseFile);

    expect(bankLetter).not.toContain("This is a third party breach");
    expect(bankLetter).not.toContain("my liability in these circumstances is nil");
    expect(bankLetter).toContain("No completed NCRP or 1930 report is recorded");
    expect(bankLetter).toContain("state whether you personally initiated or approved");

    expect(ombudsman).not.toContain("More than thirty days have elapsed");
    expect(ombudsman).not.toContain("my liability is nil");
    expect(ombudsman).toContain("this draft does not presume zero liability");
    expect(ombudsman).toContain("Do not claim delay or rejection unless true");
  });

  it("mentions NCRP and 1930 as completed only when their timeline tracks are complete", () => {
    const caseFile = makeCase({
      tracks: [
        { id: "ncrp", doneAt: "2026-09-03T09:00:00.000Z", ref: "NCRP-123" },
        { id: "helpline", doneAt: "2026-09-03T09:15:00.000Z", ref: "1930-456" },
      ],
    });

    for (const document of [ruleBankLetter(caseFile), ruleOmbudsman(caseFile)]) {
      expect(document).toContain("I reported the matter through the National Cyber Crime Reporting Portal");
      expect(document).toContain("reference NCRP-123");
      expect(document).toContain("I reported the matter through cybercrime helpline 1930");
      expect(document).toContain("reference 1930-456");
    }
  });
});
