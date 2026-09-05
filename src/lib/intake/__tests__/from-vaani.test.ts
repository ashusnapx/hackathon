import { describe, expect, it } from "vitest";

import { mapVaaniCall, matchCategory } from "../from-vaani";
import demoCall from "@/lib/demo/call.json";

/** A call with every field the agent can fill, as the provider returns them. */
const FULL_CALL = {
  caller_name: "Sunita",
  amount_inr: 10000,
  bank_name: "HDFC",
  suspect_upi: "scammer@12345",
  transaction_reference: "64321",
  payment_method: "Paytm",
  state: "Karnataka",
  district: "Bangalore",
  money_moved: true,
  incident_timing: "2026-09-04",
  possible_category: "Investment Fraud / Money Doubling Scam",
  chronology_draft: "The caller was added to an Instagram investment group and paid 10,000 INR.",
};

describe("filling the case from what the call already returned", () => {
  it("takes every concrete fact from a call without asking a model", () => {
    const facts = mapVaaniCall(FULL_CALL);

    expect(facts.triage.amount).toBe(10000);
    expect(facts.callerName).toBe("Sunita");
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
    const facts = mapVaaniCall(FULL_CALL);
    expect(facts.needsModel).toBe(false);
    expect(facts.modelNeededFor).toEqual([]);
    expect(facts.triage.englishNarrative).toMatch(/Instagram/);
    expect(facts.filledFromCall).toBeGreaterThan(10);
  });

  // The call the landing page plays is the one claim on this site that a
  // stranger can check against a recording, so it is held to the same bar as
  // the code: the fields it advertises have to survive the mapper.
  it("maps the demo call the landing page ships", () => {
    const facts = mapVaaniCall(demoCall.extracted as Record<string, unknown>);

    expect(facts.callerName).toBe("Pranav");
    expect(facts.triage.amount).toBe(10000);
    expect(facts.moneyMoved).toBe("no");
    expect(facts.triage.incidentAt?.slice(0, 10)).toBe("2026-09-03");
    expect(facts.triage.categoryId).toBe("financial-fraud");
    expect(facts.evidenceText).toMatch(/[Ss]creenshot/);
    expect(facts.needsModel).toBe(false);
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
