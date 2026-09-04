import { describe, expect, it } from "vitest";
import { findCategory } from "@/lib/case/categories";
import { newCase } from "@/lib/case/store";
import { assessRbiEligibility } from "@/lib/legal/rbi";
import { ruleChakshu, ruleDocs, ruleFir, ruleMrm, ruleNcrp, ruleTriage } from "../fallback";

function caseWithoutOfficialReports() {
  return newCase({
    rawStatement: "A caller impersonated my bank and persuaded me to send money.",
    incidentAt: "2026-09-04T10:00:00.000Z",
    amount: 25_000,
    suspect: {
      phones: ["9876543210"],
      upiIds: [],
      accounts: [],
      urls: [],
      handles: [],
    },
  });
}

describe("fallback document factual boundaries", () => {
  it("does not invent an NCRP or 1930 report in an FIR application", () => {
    const output = ruleFir(caseWithoutOfficialReports());
    expect(output).toContain("No completed NCRP or 1930 report is recorded");
    expect(output).not.toContain("I have reported the matter on");
  });

  it("adds an NCRP statement to Chakshu text only from a completed track", () => {
    const unreported = ruleChakshu(caseWithoutOfficialReports());
    expect(unreported).not.toContain("I also filed an NCRP complaint");

    const reportedCase = caseWithoutOfficialReports();
    reportedCase.tracks.push({
      id: "ncrp",
      doneAt: "2026-09-04T11:00:00.000Z",
      ref: "NCRP-REAL-USER-ENTERED",
    });
    expect(ruleChakshu(reportedCase)).toContain("I also filed an NCRP complaint under acknowledgement NCRP-REAL-USER-ENTERED");
  });

  it("keeps restoration states separate and omits unsupported threshold promises", () => {
    const output = ruleMrm(caseWithoutOfficialReports());
    expect(output).toContain("A complaint acknowledgement, a fund hold, a recoverable balance, an order and a");
    expect(output).toContain("Nothing here proves that money is held or");
    expect(output).not.toContain("Rs. 50,000");
    expect(output).not.toContain("fifteen calendar days");
  });

  it("does not turn a victim-approved payment into an unauthorised transaction", () => {
    const c = caseWithoutOfficialReports();
    const input = {
      initiation: "victim" as const,
      credentialsShared: "unknown" as const,
      suspectedBankFault: "unknown" as const,
      reportTiming: "unknown" as const,
    };
    c.legal = { rbi: { input, assessment: assessRbiEligibility(input), assessedAt: "2026-09-04T11:00:00.000Z" } };
    const output = ruleNcrp(c);
    expect(output).toContain("I initiated or approved a payment");
    expect(output).not.toMatch(/I did not (?:initiate|approve)/i);
    expect(output).not.toMatch(/without my (?:consent|authorisation|authorization)/i);
  });

  it("keeps incident time unknown when the narrative supplies no timestamp", () => {
    const triage = ruleTriage("A fake profile is using my photographs online.", new Date("2026-09-04T12:00:00.000Z"));
    expect(triage.incidentAt).toBeUndefined();
    expect(triage.urgency).toBe("moderate");
  });

  it("does not apply post-commencement BNSS procedure as the incident law to an older date", () => {
    const c = caseWithoutOfficialReports();
    c.incidentAt = "2023-06-01T10:00:00.000Z";
    const output = ruleFir(c);
    expect(output).toContain("predates 1 July 2024");
    expect(output).not.toContain("BNSS section 173 contains");
  });

  it("generates only route-applicable documents for a non-financial case", () => {
    const c = caseWithoutOfficialReports();
    const category = findCategory("social-media")!;
    c.amount = undefined;
    c.triage = {
      categoryId: category.id,
      subcategoryId: "fake-profile",
      confidence: 1,
      applicableTracks: category.tracks,
      urgency: "moderate",
    };
    c.suspect.phones = [];
    c.entities.phones = [];
    expect(Object.keys(ruleDocs(c)).sort()).toEqual(["fir", "ncrp"]);
  });
});
