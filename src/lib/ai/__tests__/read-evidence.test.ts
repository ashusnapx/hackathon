import { describe, expect, it } from "vitest";

import { cleanReadEvidence, isEmptyRead } from "../read-evidence";

describe("what a model is allowed to lift off a screenshot", () => {
  it("keeps legible values", () => {
    const read = cleanReadEvidence({
      reference: "UTR123456789012",
      amountInr: 10000,
      occurredAt: "2026-09-05",
      accountLast4: "4321",
      upiId: "someone@okaxis",
      bankName: "State Bank of India",
      kind: "bank SMS about a debit",
    });

    expect(read.reference).toBe("UTR123456789012");
    expect(read.amountInr).toBe(10_000);
    expect(read.occurredAt).toBe("2026-09-05");
    expect(read.accountLast4).toBe("4321");
  });

  it("drops the words a model uses when it cannot read something", () => {
    // "Suspect email: unknown" on a police complaint is how this goes wrong.
    const read = cleanReadEvidence({
      reference: "unknown",
      upiId: "N/A",
      bankName: "not visible",
      phone: "  ",
    });
    expect(read).toEqual({});
    expect(isEmptyRead(read)).toBe(true);
  });

  it("never lets a full account number through as last four digits", () => {
    // The instruction says four digits. A model that ignores it must not be
    // able to put a whole account number into a case file.
    expect(cleanReadEvidence({ accountLast4: "50100234567890" }).accountLast4).toBe("7890");
    expect(cleanReadEvidence({ accountLast4: "XXXX XXXX 1234" }).accountLast4).toBe("1234");
    expect(cleanReadEvidence({ accountLast4: "12" }).accountLast4).toBeUndefined();
  });

  it("refuses a date it cannot trust", () => {
    expect(cleanReadEvidence({ occurredAt: "05/09/2026" }).occurredAt).toBeUndefined();
    expect(cleanReadEvidence({ occurredAt: "yesterday" }).occurredAt).toBeUndefined();
    expect(cleanReadEvidence({ occurredAt: "2026-13-45" }).occurredAt).toBeUndefined();
    expect(cleanReadEvidence({ occurredAt: "2026-09-05" }).occurredAt).toBe("2026-09-05");
  });

  it("refuses an amount that is not a positive number", () => {
    expect(cleanReadEvidence({ amountInr: 0 }).amountInr).toBeUndefined();
    expect(cleanReadEvidence({ amountInr: -500 }).amountInr).toBeUndefined();
    expect(cleanReadEvidence({ amountInr: "10,000" }).amountInr).toBeUndefined();
    expect(cleanReadEvidence({ amountInr: 9999.6 }).amountInr).toBe(10_000);
  });

  it("survives a response that is not an object at all", () => {
    for (const value of [null, undefined, "read it", 42, []]) {
      expect(cleanReadEvidence(value)).toEqual({});
    }
  });

  it("does not count a description alone as having read anything", () => {
    // A model that returns only "this looks like a bank SMS" has extracted no
    // facts, and the panel must not offer it as though it had.
    expect(isEmptyRead(cleanReadEvidence({ kind: "bank SMS", note: "blurry" }))).toBe(true);
    expect(isEmptyRead(cleanReadEvidence({ kind: "bank SMS", amountInr: 500 }))).toBe(false);
  });

  it("truncates a note long enough to be a transcript", () => {
    const read = cleanReadEvidence({ note: "x".repeat(500), amountInr: 1 });
    expect(read.note?.length).toBe(200);
  });
});
