import { describe, expect, it } from "vitest";

import { mapVaaniCall, matchCategory } from "../from-vaani";
import demoCall from "@/lib/demo/call.json";

describe("filling the case from what the call already returned", () => {
  it("takes every concrete fact from a real call without asking a model", () => {
    const facts = mapVaaniCall(demoCall.extracted as Record<string, unknown>);

    expect(facts.triage.amount).toBe(10000);
    expect(facts.bankName).toBe("HDFC");
    expect(facts.entities.upiIds).toEqual(["scammer@12345"]);
    expect(facts.entities.refs).toEqual(["64321"]);
    expect(facts.entities.apps).toContain("Paytm");
    expect(facts.state).toBe("Karnataka");
    expect(facts.district).toBe("Bangalore");
    expect(facts.moneyMoved).toBe("yes");
    expect(facts.triage.incidentAt?.slice(0, 10)).toBe("2026-09-04");
  });

  it("needs no model at all when the provider returned a category and a chronology", () => {
    const facts = mapVaaniCall(demoCall.extracted as Record<string, unknown>);
    expect(facts.needsModel).toBe(false);
    expect(facts.modelNeededFor).toEqual([]);
    expect(facts.triage.englishNarrative).toMatch(/Instagram/);
    expect(facts.filledFromCall).toBeGreaterThan(10);
  });

  it("asks the model only for what is missing", () => {
    const facts = mapVaaniCall({ amount_inr: 5000, money_moved: true });
    expect(facts.needsModel).toBe(true);
    expect(facts.modelNeededFor).toEqual(["category", "english-narrative"]);
    expect(facts.triage.amount).toBe(5000);
  });

  it("routes the provider's own words through the NCRP taxonomy", () => {
    expect(matchCategory("Investment Fraud / Money Doubling Scam")?.categoryId).toBe("financial-fraud");
    expect(matchCategory("caller was told he was under digital arrest by CBI")?.categoryId)
      .toBe("digital-arrest");
    expect(matchCategory("someone made a fake Instagram profile with her photos")?.categoryId)
      .toBe("social-media");
    expect(matchCategory("nothing recognisable here")).toBeNull();
  });

  it("keeps a deceived payment separate from an unauthorised one", () => {
    expect(mapVaaniCall({ transaction_authorisation: "approved" }).transactionInitiation).toBe("victim");
    expect(mapVaaniCall({ transaction_authorisation: "scanned QR under pressure" }).transactionInitiation)
      .toBe("victim");
    expect(mapVaaniCall({ transaction_authorisation: "not initiated by the victim" }).transactionInitiation)
      .toBe("not-victim");
  });

  it("ignores nulls and empty strings the provider sends for unfilled fields", () => {
    const facts = mapVaaniCall({
      suspect_phone: null, suspect_email: "", bank_name: "null", amount_inr: 0,
    });
    expect(facts.entities.phones).toEqual([]);
    expect(facts.entities.emails).toEqual([]);
    expect(facts.bankName).toBeUndefined();
    expect(facts.triage.amount).toBeUndefined();
  });
});
