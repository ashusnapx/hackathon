/**
 * Reading a screenshot the citizen already holds.
 *
 * The most common piece of evidence in an Indian fraud case is a photograph of
 * a bank SMS, and until now the Evidence Vault treated it as bytes: stored,
 * hashed, listed, never read. Meanwhile the person was asked to type the UTR
 * out of it by hand — a twelve-digit number, from a screenshot, on a phone,
 * while distressed. That is where wrong reference numbers on police complaints
 * come from.
 *
 * So this reads it. Three rules make that safe enough to do at all:
 *
 *   · **Nothing is applied.** Every field comes back as a draft the citizen
 *     confirms, exactly like the voice agent's extraction. A model reading a
 *     compressed screenshot will sometimes turn a 5 into an S.
 *   · **Nothing is invented.** A field that is not legible in the image comes
 *     back absent, not guessed. "Probably around ten thousand" on a bank
 *     dispute letter is worse than a blank.
 *   · **Nothing is sent without being asked.** Evidence lives in the browser;
 *     uploading a frame of it to a model is a decision the person makes per
 *     file, having been told, and never a background convenience.
 */

export interface ReadEvidenceResult {
  /** UTR / RRN / transaction reference, as printed. */
  reference?: string;
  amountInr?: number;
  /** ISO date, only when the image carries an unambiguous one. */
  occurredAt?: string;
  /** Last four digits only — a full account number is never lifted. */
  accountLast4?: string;
  upiId?: string;
  phone?: string;
  bankName?: string;
  /** What kind of document this appears to be, in the citizen's words. */
  kind?: string;
  /** Anything legible that did not fit a field, for the person to read. */
  note?: string;
}

export const READ_EVIDENCE_SYSTEM = `You read one image of a document a fraud victim in India already holds — usually a screenshot of a bank SMS, a UPI app receipt, a bank statement line, or a chat.

Extract only what is legibly printed in the image.

Absolute rules:
- Never guess. If a value is blurred, cropped, or absent, omit the field. An omitted field is a correct answer.
- Never infer a value from context or from what is typical. Only what the pixels say.
- "reference" is the UTR, RRN, transaction ID or reference number exactly as printed, including letters.
- "amountInr" is a plain number, no symbols or separators. Only if an amount is shown.
- "occurredAt" is YYYY-MM-DD, and only when the image shows an unambiguous date. A time alone is not a date.
- "accountLast4" is at most the final four digits. Never return a fuller account number even if the image shows one.
- "kind" is a short plain phrase, e.g. "bank SMS about a debit".
- "note" is for anything legible and relevant that has no field. Keep it under 200 characters.

You are reading for somebody who will put these numbers on a police complaint. A wrong digit is worse than a blank field.`;

export const READ_EVIDENCE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [],
  properties: {
    reference: { type: "string" },
    amountInr: { type: "number" },
    occurredAt: { type: "string" },
    accountLast4: { type: "string" },
    upiId: { type: "string" },
    phone: { type: "string" },
    bankName: { type: "string" },
    kind: { type: "string" },
    note: { type: "string" },
  },
} as const;

/** Values a model returns when it means "I could not read this". */
const REFUSALS = new Set([
  "", "unknown", "n/a", "na", "none", "null", "undefined", "not visible",
  "not legible", "not shown", "not available", "not applicable", "-",
]);

function text(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed || REFUSALS.has(trimmed.toLowerCase())) return undefined;
  return trimmed.slice(0, max);
}

/**
 * Everything the model returns, checked before it reaches the case.
 *
 * The schema constrains shape, not sense: it will happily accept "unknown" as
 * a reference number and a full sixteen-digit account as `accountLast4`. This
 * is where those stop.
 */
export function cleanReadEvidence(value: unknown): ReadEvidenceResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const raw = value as Record<string, unknown>;

  const amount = typeof raw.amountInr === "number" && Number.isFinite(raw.amountInr) && raw.amountInr > 0
    ? Math.round(raw.amountInr)
    : undefined;

  const date = text(raw.occurredAt, 10);
  const occurredAt = date && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date))
    ? date
    : undefined;

  // Truncated rather than rejected: the instruction is explicit, and a model
  // that returns the whole number anyway must not have it reach the case.
  const last4 = text(raw.accountLast4, 32)?.replace(/\D/g, "").slice(-4);

  return {
    ...(text(raw.reference, 40) ? { reference: text(raw.reference, 40) } : {}),
    ...(amount !== undefined ? { amountInr: amount } : {}),
    ...(occurredAt ? { occurredAt } : {}),
    ...(last4 && last4.length === 4 ? { accountLast4: last4 } : {}),
    ...(text(raw.upiId, 80) ? { upiId: text(raw.upiId, 80) } : {}),
    ...(text(raw.phone, 20) ? { phone: text(raw.phone, 20) } : {}),
    ...(text(raw.bankName, 80) ? { bankName: text(raw.bankName, 80) } : {}),
    ...(text(raw.kind, 80) ? { kind: text(raw.kind, 80) } : {}),
    ...(text(raw.note, 200) ? { note: text(raw.note, 200) } : {}),
  };
}

/** True when there is nothing worth showing the person. */
export function isEmptyRead(result: ReadEvidenceResult): boolean {
  return Object.keys(result).filter((key) => key !== "kind" && key !== "note").length === 0;
}
