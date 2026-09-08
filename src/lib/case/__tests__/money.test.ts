import { describe, expect, it } from "vitest";

import { inr, moneyLedger, type MoneyEntry } from "../money";
import { newCase } from "../store";
import type { CaseFile } from "../types";

const NOW = new Date("2026-09-07T12:00:00.000Z");

function caseWith(amount: number | undefined, money: MoneyEntry[] = [], txns: CaseFile["txns"] = []): CaseFile {
  return { ...newCase({ amount, txns, money }) };
}

const entry = (over: Partial<MoneyEntry> & Pick<MoneyEntry, "state" | "amountInr">): MoneyEntry => ({
  id: over.id ?? `e-${over.state}-${over.amountInr}`,
  at: over.at ?? "2026-09-01T00:00:00.000Z",
  toldBy: over.toldBy ?? "bank",
  ...over,
});

describe("the money ledger", () => {
  it("starts with everything unknown, because nobody has said anything", () => {
    // The most important default in the file: reporting a fraud tells you
    // nothing about where the money is, and the ledger must not imply it does.
    const ledger = moneyLedger(caseWith(50_000), NOW);

    expect(ledger.disputedInr).toBe(50_000);
    expect(ledger.unknown).toBe(50_000);
    expect(ledger.held).toBe(0);
    expect(ledger.returned).toBe(0);
    expect(ledger.hasMovements).toBe(false);
    expect(ledger.heldForDays).toBeNull();
  });

  it("falls back to the sum of transactions when no headline amount is set", () => {
    const ledger = moneyLedger(
      caseWith(undefined, [], [{ amount: 4_000 }, { amount: 6_000 }, { amount: undefined }]),
      NOW,
    );
    expect(ledger.disputedInr).toBe(10_000);
  });

  it("counts only what somebody was actually told", () => {
    const ledger = moneyLedger(
      caseWith(50_000, [entry({ state: "held", amountInr: 30_000, toldBy: "bank" })]),
      NOW,
    );

    expect(ledger.held).toBe(30_000);
    expect(ledger.unknown).toBe(20_000);
    expect(ledger.hasMovements).toBe(true);
  });

  it("does not count a hold as still frozen once a refund settles it", () => {
    // A hold recorded in March and the refund recorded in May are both true.
    // Counting them separately would show 60,000 recovered out of 50,000.
    const ledger = moneyLedger(
      caseWith(50_000, [
        entry({ id: "hold-1", state: "held", amountInr: 30_000, at: "2026-08-01T00:00:00.000Z" }),
        entry({ state: "returned", amountInr: 30_000, at: "2026-09-01T00:00:00.000Z", releases: "hold-1" }),
      ]),
      NOW,
    );

    expect(ledger.returned).toBe(30_000);
    expect(ledger.held).toBe(0);
    expect(ledger.unknown).toBe(20_000);
    expect(ledger.heldForDays).toBeNull();
  });

  it("releases only the specific hold that was written off", () => {
    const ledger = moneyLedger(
      caseWith(50_000, [
        entry({ id: "hold-a", state: "held", amountInr: 20_000 }),
        entry({ id: "hold-b", state: "held", amountInr: 10_000 }),
        entry({ state: "unrecoverable", amountInr: 10_000, toldBy: "police", releases: "hold-b" }),
      ]),
      NOW,
    );
    expect(ledger.held).toBe(20_000);
    expect(ledger.unrecoverable).toBe(10_000);
    // 20,000 frozen and 10,000 written off account for 30,000 of the 50,000.
    // Nobody has said anything about the rest, so it stays unknown.
    expect(ledger.unknown).toBe(20_000);
  });

  it("flags a ledger that adds up to more than was taken instead of hiding it", () => {
    // Almost always an extra zero. Clamping silently would leave somebody
    // staring at numbers that do not reconcile with no way to find out why.
    const ledger = moneyLedger(
      caseWith(50_000, [entry({ state: "held", amountInr: 500_000 })]),
      NOW,
    );

    expect(ledger.overAllocated).toBe(true);
    expect(ledger.unknown).toBe(0);
  });

  it("reports how long money has been frozen, from the earliest hold", () => {
    const ledger = moneyLedger(
      caseWith(50_000, [
        entry({ state: "held", amountInr: 10_000, at: "2026-08-18T12:00:00.000Z" }),
        entry({ state: "held", amountInr: 5_000, at: "2026-09-02T12:00:00.000Z" }),
      ]),
      NOW,
    );
    expect(ledger.heldForDays).toBe(20);
  });

  it("never returns a negative age or a negative slice", () => {
    const ledger = moneyLedger(
      caseWith(50_000, [entry({ state: "held", amountInr: 10_000, at: "2027-01-01T00:00:00.000Z" })]),
      NOW,
    );
    expect(ledger.heldForDays).toBe(0);
    expect(ledger.slices.every((slice) => slice.amountInr >= 0)).toBe(true);
  });

  it("ignores an entry with a nonsense amount rather than subtracting it", () => {
    const ledger = moneyLedger(
      caseWith(50_000, [
        entry({ state: "held", amountInr: -5_000 }),
        entry({ state: "held", amountInr: 10_000 }),
      ]),
      NOW,
    );
    expect(ledger.held).toBe(10_000);
  });

  it("keeps independent recoveries and holds separate", () => {
    const ledger = moneyLedger(
      caseWith(50_000, [
        entry({ state: "returned", amountInr: 20_000 }),
        entry({ state: "held", amountInr: 20_000 }),
      ]),
      NOW,
    );
    expect(ledger.slices.map((slice) => slice.state)).toEqual(["returned", "held", "unknown"]);
    expect(ledger.slices.map((slice) => slice.percent)).toEqual([40, 40, 20]);
  });

  it("copes with a case that never recorded an amount", () => {
    const ledger = moneyLedger(caseWith(undefined), NOW);
    expect(ledger.disputedInr).toBe(0);
    expect(ledger.slices).toEqual([]);
    expect(ledger.overAllocated).toBe(false);
  });
});

describe("writing rupees the way India writes them", () => {
  it("groups in lakhs and crores, not thousands", () => {
    expect(inr(1_000)).toBe("₹1,000");
    expect(inr(150_000)).toBe("₹1,50,000");
    expect(inr(12_500_000)).toBe("₹1,25,00,000");
  });
});
