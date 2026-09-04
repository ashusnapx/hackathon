export type BankNoticeDateResult =
  | { ok: true; iso: string }
  | { ok: false; reason: "required" | "invalid" | "future" };

/** Convert an ISO timestamp to the wall-clock format used by datetime-local. */
export function toLocalDateTimeInput(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

/**
 * Validate a bank-notice time supplied by the citizen.
 *
 * RBI clocks must never be anchored to the moment a UI button happened to be
 * clicked. `datetime-local` deliberately carries no timezone, so parsing it in
 * the browser's timezone is the least surprising representation of the time
 * the citizen entered.
 */
export function parseBankNoticeDate(value: string, now = new Date()): BankNoticeDateResult {
  if (!value.trim()) return { ok: false, reason: "required" };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { ok: false, reason: "invalid" };
  if (parsed.getTime() > now.getTime()) return { ok: false, reason: "future" };
  return { ok: true, iso: parsed.toISOString() };
}

/** Server/store-side check for the already-normalised timestamp. */
export function isValidPastOrPresentIso(value: string | undefined, now = new Date()): value is string {
  if (!value) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.getTime() <= now.getTime();
}
