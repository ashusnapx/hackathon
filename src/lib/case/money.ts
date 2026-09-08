import type { CaseFile } from "./types";

/**
 * Where the money actually is.
 *
 * Kavach has always tracked *actions* — ten of them, each with its own
 * conditional deadline. What it never tracked is the thing the person actually
 * cares about, which is their money. Somebody four weeks into a case can see
 * that they have filed on NCRP and written to their bank, and still have no
 * idea whether a single rupee has been stopped.
 *
 * This is the ledger for that, and it is built on one rule that shapes
 * everything else: **nothing here is inferred.** An NCRP acknowledgement is not
 * a hold. A bank complaint is not a freeze. A track marked done is not money
 * recovered. Every rupee that moves out of "unknown" does so because the person
 * was told something by somebody they can name, and recorded it. The temptation
 * to derive a hopeful number from a completed checklist is exactly how a victim
 * ends up believing their savings are safe when nobody has said so.
 *
 * The states are the ones a victim is actually told, in the words they are told
 * them in:
 *
 *   · **unknown** — the default. Reported, and nobody has said what happened.
 *   · **held** — a bank, PSP or investigator says this much is frozen or lien-
 *     marked. Stopped, not returned. It can still be lost.
 *   · **returned** — actually back in an account they control.
 *   · **unrecoverable** — somebody with standing has said this much is gone.
 *
 * Held money is deliberately not counted as good news. It is money sitting in
 * somebody else's account under a lien, waiting on a process that may need a
 * magistrate, and calling it "recovered" would be the single most misleading
 * thing this product could do.
 */

export type MoneyStateId = "unknown" | "held" | "returned" | "unrecoverable";

/** Who said so. A movement with no author is not recorded. */
export type MoneyToldBy = "bank" | "police" | "portal" | "court" | "other";

export interface MoneyEntry {
  id: string;
  state: Exclude<MoneyStateId, "unknown">;
  /** Rupees. Whole numbers; a paisa has never mattered in one of these cases. */
  amountInr: number;
  /** When they were told, not when they typed it in. */
  at: string;
  toldBy: MoneyToldBy;
  /** The reference the bank or portal gave, if any. */
  ref?: string;
  note?: string;
  /**
   * For a `returned` or `unrecoverable` entry: the id of the hold it settles.
   *
   * Without this the ledger has to guess. Somebody records a 30,000 hold in
   * March and a 30,000 refund in May, and those are the same rupees; somebody
   * else recovers 20,000 directly while a different 20,000 sits frozen, and
   * those are not. Subtracting every refund from every hold gets the second
   * case wrong; subtracting none gets the first wrong and shows more money
   * accounted for than was ever taken.
   *
   * So the settlement is stated rather than inferred, and an entry that names
   * no hold is simply money that arrived from somewhere else.
   */
  releases?: string;
}

export interface MoneySlice {
  state: MoneyStateId;
  amountInr: number;
  /** Of the disputed total, 0–100. */
  percent: number;
}

export interface MoneyLedger {
  /** What the case says was taken. Zero when no amount is recorded. */
  disputedInr: number;
  slices: MoneySlice[];
  held: number;
  returned: number;
  unrecoverable: number;
  unknown: number;
  /**
   * True when recorded movements exceed the disputed total.
   *
   * Usually a typo — an extra zero — and shown as a question rather than
   * silently clamped, because quietly swallowing it would leave somebody
   * looking at a ledger that does not add up and no way to find out why.
   */
  overAllocated: boolean;
  /** Days since the earliest still-standing hold, or null if nothing is held. */
  heldForDays: number | null;
  /** Set once any movement has been recorded at all. */
  hasMovements: boolean;
}

const ORDER: MoneyStateId[] = ["returned", "held", "unrecoverable", "unknown"];

function disputedTotal(caseFile: CaseFile): number {
  if (typeof caseFile.amount === "number" && caseFile.amount > 0) return caseFile.amount;
  // Falls back to the transactions when no headline amount was confirmed, so a
  // case built entirely from individual debits still shows a total.
  const summed = (caseFile.txns ?? []).reduce(
    (total, txn) => total + (typeof txn.amount === "number" && txn.amount > 0 ? txn.amount : 0),
    0,
  );
  return summed;
}

function sumOf(entries: MoneyEntry[], state: MoneyEntry["state"]): number {
  return entries
    .filter((entry) => entry.state === state)
    .reduce((total, entry) => total + (entry.amountInr > 0 ? entry.amountInr : 0), 0);
}

/**
 * The ledger, computed fresh from the case.
 *
 * Not stored: a derived total that can drift from the entries it came from is a
 * total nobody can check.
 */
export function moneyLedger(caseFile: CaseFile, now = new Date()): MoneyLedger {
  const entries = caseFile.money ?? [];
  const disputedInr = disputedTotal(caseFile);

  const returned = sumOf(entries, "returned");
  const unrecoverable = sumOf(entries, "unrecoverable");
  const heldRaw = sumOf(entries, "held");

  // Only holds that something explicitly settled leave the frozen pool. See
  // `releases` above for why this is stated rather than worked out.
  const settled = new Set(
    entries.filter((entry) => entry.state !== "held" && entry.releases).map((entry) => entry.releases!),
  );
  const releasedFromHold = entries
    .filter((entry) => entry.state === "held" && settled.has(entry.id))
    .reduce((total, entry) => total + (entry.amountInr > 0 ? entry.amountInr : 0), 0);
  const held = Math.max(0, heldRaw - releasedFromHold);

  const accounted = held + returned + unrecoverable;
  const overAllocated = disputedInr > 0 && accounted > disputedInr;
  const unknown = Math.max(0, disputedInr - accounted);

  const totals: Record<MoneyStateId, number> = { returned, held, unrecoverable, unknown };
  const basis = disputedInr > 0 ? disputedInr : accounted;

  const slices = ORDER
    .map((state) => ({
      state,
      amountInr: totals[state],
      percent: basis > 0 ? Math.round((totals[state] / basis) * 100) : 0,
    }))
    .filter((slice) => slice.amountInr > 0);

  return {
    disputedInr,
    slices,
    held,
    returned,
    unrecoverable,
    unknown,
    overAllocated,
    heldForDays: heldForDays(entries.filter((entry) => !settled.has(entry.id)), held, now),
    hasMovements: entries.length > 0,
  };
}

/**
 * How long the money has been sitting frozen.
 *
 * Elapsed time, not a countdown. There is no nationwide statutory clock that
 * starts when a bank marks a lien, and inventing one would put a fake deadline
 * on the most emotionally loaded number in the case. What a person can be told
 * truthfully is how long it has been — which is what turns "it is being looked
 * into" into "it has been being looked into for fifty-one days".
 */
function heldForDays(entries: MoneyEntry[], held: number, now: Date): number | null {
  if (held <= 0) return null;
  const times = entries
    .filter((entry) => entry.state === "held")
    .map((entry) => new Date(entry.at).getTime())
    .filter((time) => Number.isFinite(time));
  if (!times.length) return null;
  return Math.max(0, Math.floor((now.getTime() - Math.min(...times)) / 86_400_000));
}

export function newMoneyEntry(input: Omit<MoneyEntry, "id">): MoneyEntry {
  return { ...input, id: globalThis.crypto.randomUUID() };
}

/** Rupees, the way they are written in India. */
export function inr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}
