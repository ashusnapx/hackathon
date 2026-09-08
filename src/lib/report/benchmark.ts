import { FIELDS, FRICTIONS } from "./schema";

/**
 * The comparison with the portal, computed rather than typed.
 *
 * ── Why this file exists ────────────────────────────────────────────────────
 *
 * This project holds every legal claim to a source and every statistic to a
 * primary document, and then made its central claim — that reporting here is
 * easier than reporting on the portal — with nothing behind it at all. It was
 * the one assertion on the site that was pure assertion.
 *
 * This closes half of that gap. Everything below is derived from the field
 * schema and the documented frictions, so the numbers on the page cannot drift
 * away from the product: relax a field and the figure moves, add a blocking
 * question and it moves back. They are also tested, which a hand-typed "16" in
 * a translation file never was.
 *
 * ── The half this does not close ────────────────────────────────────────────
 *
 * Counting fields is not measuring people. A form with six questions can still
 * be slower than one with sixteen if the six are badly asked, and nothing here
 * would notice. The only way to know is to sit five people down and time them,
 * which is what `docs/usability-protocol.md` is for. These figures are the
 * structural claim — how much a person is *required* to produce before the
 * system will accept their complaint — and that is worth stating precisely
 * while the human study is still outstanding.
 *
 * Nothing here should ever be described as "x% faster". It is not a speed
 * measurement and must not be dressed as one.
 */

export interface Benchmark {
  /** Fields the portal will not submit without. */
  portalRequired: number;
  /** Of those, how many Kavach does not block on. */
  relaxed: number;
  /** Fields Kavach blocks on — what you must produce before it will proceed. */
  kavachRequired: number;
  /** Everything modelled, blocking or not. */
  totalModelled: number;
  /** Fields Kavach works out rather than asking for. */
  derived: number;
  /** Fields deferred until after the complaint exists. */
  deferred: number;
  /** Documented ways the current form costs somebody their complaint. */
  documentedFrictions: number;
  /**
   * Share of the portal's mandatory fields that are not a precondition here.
   * Rounded to whole percent, because the input is a count of about twenty and
   * a decimal place would imply a precision this does not have.
   */
  relaxedShare: number;
}

export function benchmark(): Benchmark {
  const portalRequired = FIELDS.filter((f) => f.ncrp === "required").length;
  const relaxed = FIELDS.filter(
    (f) => f.ncrp === "required" && (f.kavach === "optional" || f.kavach === "later" || f.kavach === "derived"),
  ).length;

  return {
    portalRequired,
    relaxed,
    kavachRequired: FIELDS.filter((f) => f.kavach === "required").length,
    totalModelled: FIELDS.length,
    derived: FIELDS.filter((f) => f.kavach === "derived").length,
    deferred: FIELDS.filter((f) => f.kavach === "later").length,
    documentedFrictions: FRICTIONS.length,
    relaxedShare: portalRequired ? Math.round((relaxed / portalRequired) * 100) : 0,
  };
}

/**
 * The one number that is not ours to compute.
 *
 * Thirty minutes is the portal's OTP validity, from the Ministry of Home
 * Affairs' Citizen Manual. It is quoted, not measured, and it is kept here
 * beside the computed figures so that the difference between "we counted this"
 * and "they published this" is visible in the code rather than only on the
 * page.
 */
export const PORTAL_OTP_MINUTES = 30;
