import { RBI_2026_AMENDMENT, RBI_2017_CIRCULAR, rbiFrameworkFor } from "@/lib/legal/rbi";
import { RBI_OMBUDSMAN_2026 } from "@/lib/legal/ombudsman";
import type { DictKey } from "@/lib/i18n/dict/en";
import type { TrackId } from "./types";

/**
 * What it actually costs to be late.
 *
 * Kavach has always shown *when* each deadline falls. It has never shown what
 * changes when one passes, and those are different questions: a date on its own
 * is an instruction to hurry, which is what everybody already knows. "Cross this
 * day and your bank stops owing you zero liability and starts owing you a
 * capped amount under its own board policy" is a reason.
 *
 * Two shapes, and keeping them apart matters more than anything else here:
 *
 *   · **forfeit** — the citizen loses something by being late. Their own
 *     deadline, their own cost.
 *   · **entitlement** — somebody *else* is late. A bank that misses its own
 *     ten-working-day credit obligation has not cost the citizen anything; it
 *     has handed them a ground for the Ombudsman. Rendering that in red as
 *     though they had failed would be both wrong and cruel.
 *
 * Only deadlines with a real consequence in a cited instrument appear. Calling
 * 1930 and filing on NCRP are urgent and have no nationwide cutoff, so they get
 * nothing here rather than an invented penalty — the same rule the deadline
 * engine already follows.
 */

export type DelayCostKind = "forfeit" | "entitlement";

export interface DelayCost {
  /**
   * A liability ladder, when the rule is one.
   *
   * The two bank-notice rules are not a sentence, they are a table: report
   * inside one window and you owe nothing, inside the next and you owe a
   * capped amount, outside both and your bank decides. Written as prose it ran
   * to four sentences of paragraph references that nobody in the first week of
   * a fraud is going to read. Written as rungs it is four short lines, and the
   * person can find the one they are standing on.
   */
  rungKeys?: DictKey[];
  kind: DelayCostKind;
  /** One sentence: what changes the day after. */
  bodyKey: DictKey;
  /** Named instrument, so the claim can be checked. */
  sourceTitle: string;
  sourceUrl: string;
}

/**
 * The cost attached to one track, for this case.
 *
 * `null` for every track whose deadline is a matter of urgency rather than of
 * entitlement — which is most of them, and deliberately so.
 */
export function costOfDelay(trackId: TrackId, incidentAt?: string): DelayCost | null {
  switch (trackId) {
    case "bank-notice":
      return bankNoticeCost(incidentAt);

    case "ombudsman":
      return {
        kind: "forfeit",
        // Clause 10(1)(g): a complaint filed after the limitation period is not
        // a weaker complaint, it is not entertained at all.
        bodyKey: "delay.ombudsman",
        sourceTitle: RBI_OMBUDSMAN_2026.title,
        sourceUrl: RBI_OMBUDSMAN_2026.url,
      };

    case "bank-credit":
      return {
        kind: "entitlement",
        bodyKey: "delay.bankCredit",
        sourceTitle: RBI_2017_CIRCULAR.title,
        sourceUrl: RBI_2017_CIRCULAR.readableUrl,
      };

    case "bank-resolution":
      return {
        kind: "entitlement",
        bodyKey: "delay.bankResolution",
        sourceTitle: RBI_2017_CIRCULAR.title,
        sourceUrl: RBI_2017_CIRCULAR.readableUrl,
      };

    default:
      return null;
  }
}

/**
 * The one that moves.
 *
 * Which ladder applies is decided by when the money moved, not by today: a
 * transaction from December 2026 keeps the 2017 circular's three-working-day
 * step into paragraph 7(ii), while one from January 2027 onwards is on the
 * amendment's five-calendar-day rule. Reading this off the current date would
 * tell people the wrong deadline for months either side of the changeover.
 */
function bankNoticeCost(incidentAt?: string): DelayCost {
  const framework = rbiFrameworkFor(incidentAt);

  if (framework === "2026") {
    return {
      kind: "forfeit",
      bodyKey: "delay.bankNotice2026",
      rungKeys: ["delay.b26.r1", "delay.b26.r2", "delay.b26.r3", "delay.fault"],
      sourceTitle: RBI_2026_AMENDMENT.title,
      sourceUrl: RBI_2026_AMENDMENT.url,
    };
  }

  return {
    kind: "forfeit",
    bodyKey: "delay.bankNotice2017",
    rungKeys: ["delay.b17.r1", "delay.b17.r2", "delay.b17.r3", "delay.fault"],
    sourceTitle: RBI_2017_CIRCULAR.title,
    sourceUrl: RBI_2017_CIRCULAR.readableUrl,
  };
}
