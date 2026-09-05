import { describe, expect, it } from "vitest";

import { caseUpdatesFromCall } from "../from-call";
import { newCase } from "../store";
import { mapVaaniCall } from "@/lib/intake/from-vaani";

const CALL = mapVaaniCall({
  caller_name: "Anita",
  amount_inr: 10_000,
  bank_name: "HDFC",
  suspect_upi: "scammer@ybl",
  suspect_phone: "9876543210",
  transaction_reference: "412345678901",
  state: "Karnataka",
  district: "Bangalore",
  evidence_available: "Screenshots of the transaction",
  incident_timing: "2026-09-03",
  possible_category: "Investment Fraud / Money Doubling Scam",
  chronology_draft: "The caller paid an investment group 10,000 INR.",
});

describe("folding the agent's late fields into an open case", () => {
  it("fills what the case does not have yet", () => {
    const { patch, added } = caseUpdatesFromCall(newCase(), CALL);

    expect(patch.victim?.name).toBe("Anita");
    expect(patch.victim?.state).toBe("Karnataka");
    expect(patch.bank?.name).toBe("HDFC");
    expect(patch.amount).toBe(10_000);
    expect(patch.incidentAt?.slice(0, 10)).toBe("2026-09-03");
    expect(patch.evidenceText).toMatch(/Screenshots/);
    expect(patch.entities?.upiIds).toEqual(["scammer@ybl"]);
    expect(patch.suspect?.phones).toEqual(["9876543210"]);
    expect(patch.triage?.categoryId).toBe("financial-fraud");
    expect(patch.triage?.applicableTracks.length).toBeGreaterThan(0);
    expect(added).toContain("Name");
    expect(added).toContain("Fraud type");
  });

  it("never overrules what the person already put in the case", () => {
    const existing = newCase({
      victim: { name: "Anita Sharma", state: "Bihar" },
      bank: { name: "SBI" },
      amount: 25_000,
      incidentAt: "2026-09-01T00:00:00.000Z",
      evidenceText: "I still have the chat.",
    });
    const { patch, added } = caseUpdatesFromCall(existing, CALL);

    expect(patch.victim?.name).toBe("Anita Sharma");
    expect(patch.victim?.state).toBe("Bihar");
    expect(patch.bank).toBeUndefined();
    expect(patch.amount).toBeUndefined();
    expect(patch.incidentAt).toBeUndefined();
    expect(patch.evidenceText).toBeUndefined();
    expect(added).not.toContain("Bank");
    expect(added).not.toContain("Amount");
    // The district was genuinely missing, so it is still offered.
    expect(patch.victim?.district).toBe("Bangalore");
  });

  it("adds identifiers to a list without dropping the ones already there", () => {
    const existing = newCase({
      entities: {
        upiIds: ["typed@ybl"], phones: [], accounts: [], refs: [],
        urls: [], emails: [], handles: [], apps: [],
      },
    });
    const { patch } = caseUpdatesFromCall(existing, CALL);
    expect(patch.entities?.upiIds).toEqual(["typed@ybl", "scammer@ybl"]);
  });

  it("offers nothing when the call repeats what the case already holds", () => {
    const existing = newCase({
      entities: {
        upiIds: ["SCAMMER@YBL"], phones: ["9876543210"], accounts: [], refs: ["412345678901"],
        urls: [], emails: [], handles: [], apps: [],
      },
      suspect: { phones: ["9876543210"], upiIds: ["scammer@ybl"], accounts: [], urls: [], handles: [] },
      victim: { name: "Anita", state: "Karnataka", district: "Bangalore" },
      bank: { name: "HDFC" },
      amount: 10_000,
      incidentAt: "2026-09-03T00:00:00.000Z",
      evidenceText: "Screenshots of the transaction",
      triage: {
        categoryId: "financial-fraud", confidence: 0.9, applicableTracks: [], urgency: "high",
      },
    });
    expect(caseUpdatesFromCall(existing, CALL).added).toEqual([]);
  });

  it("does not re-route a case that already has a fraud type", () => {
    const existing = newCase({
      triage: { categoryId: "social-media", confidence: 0.9, applicableTracks: [], urgency: "moderate" },
    });
    expect(caseUpdatesFromCall(existing, CALL).patch.triage).toBeUndefined();
  });
});
