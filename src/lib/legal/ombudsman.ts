/**
 * Filing-window rules from Clause 10(1)(e)–(g) of the
 * Reserve Bank – Integrated Ombudsman Scheme, 2026.
 */
export const RBI_OMBUDSMAN_2026 = {
  id: "RB-IOS-2026",
  title: "Reserve Bank – Integrated Ombudsman Scheme, 2026",
  effectiveOn: "2026-07-01",
  provisions: ["10(1)(e)", "10(1)(f)", "10(1)(g)"],
  ordinaryResponseDays: 30,
  filingWindowDays: 90,
  url: "https://rbidocs.rbi.org.in/rdocs/content/pdfs/SCHEME16012026_A.pdf",
  faqUrl: "https://old.rbi.org.in/commonman/english/scripts/faqs.aspx?id=3407",
} as const;

export interface RbiOmbudsmanWindowInput {
  /** When the regulated entity received the citizen's first complaint. */
  regulatedEntityComplaintAt: Date;
  /**
   * A longer response period prescribed by RBI, NPCI or the card network.
   * Omit when no longer, verified product-specific period is known.
   */
  applicableResponseDays?: number;
  /** Date of an actual reply/resolution the citizen found unsatisfactory. */
  dissatisfiedReplyAt?: Date;
  /** Most recent communication from the regulated entity about the grievance. */
  lastCommunicationAt?: Date;
}

export interface RbiOmbudsmanWindow {
  responseTimelineDays: number;
  responseTimelineExpiresAt: Date;
  /** Earliest filing date supported by the supplied facts. */
  eligibleFrom: Date;
  /** Last date under the ordinary Clause 10(1)(g) computation. */
  fileBy: Date;
  eligibilityBasis: "dissatisfied_reply" | "response_timeline_expired";
  deadlineBasis: "response_timeline_expiry" | "last_communication";
  source: typeof RBI_OMBUDSMAN_2026;
}

function assertValidDate(value: Date, field: string): void {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new RangeError(`${field} must be a valid Date`);
  }
}

function addCalendarDays(from: Date, days: number): Date {
  const date = new Date(from.getTime());
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * Compute the opening and closing edges of an RB-IOS 2026 filing window.
 *
 * This does not decide whether a reply was genuinely unsatisfactory or whether
 * some other maintainability ground applies. Those remain citizen/RBI findings.
 */
export function calculateRbiOmbudsmanWindow(
  input: RbiOmbudsmanWindowInput,
): RbiOmbudsmanWindow {
  assertValidDate(input.regulatedEntityComplaintAt, "regulatedEntityComplaintAt");
  if (input.dissatisfiedReplyAt) {
    assertValidDate(input.dissatisfiedReplyAt, "dissatisfiedReplyAt");
  }
  if (input.lastCommunicationAt) {
    assertValidDate(input.lastCommunicationAt, "lastCommunicationAt");
  }

  const suppliedResponseDays = input.applicableResponseDays;
  if (
    suppliedResponseDays !== undefined &&
    (!Number.isFinite(suppliedResponseDays) || suppliedResponseDays < 0)
  ) {
    throw new RangeError("applicableResponseDays must be a finite, non-negative number");
  }

  // Clause 10(1)(f) says 30 days or the prescribed RBI/NPCI/card-network
  // timeline, whichever is higher. Fractional supplied days round up so the
  // app never opens the route earlier than the verified external rule.
  const responseTimelineDays = Math.max(
    RBI_OMBUDSMAN_2026.ordinaryResponseDays,
    Math.ceil(suppliedResponseDays ?? RBI_OMBUDSMAN_2026.ordinaryResponseDays),
  );
  const responseTimelineExpiresAt = addCalendarDays(
    input.regulatedEntityComplaintAt,
    responseTimelineDays,
  );

  const replyCanOpenWindow =
    input.dissatisfiedReplyAt &&
    input.dissatisfiedReplyAt.getTime() >= input.regulatedEntityComplaintAt.getTime() &&
    input.dissatisfiedReplyAt.getTime() < responseTimelineExpiresAt.getTime();
  const eligibleFrom = replyCanOpenWindow
    ? new Date(input.dissatisfiedReplyAt!.getTime())
    : new Date(responseTimelineExpiresAt.getTime());

  // A reply is itself a regulated-entity communication. Treat it as such even
  // when the caller has not redundantly copied it into `lastCommunicationAt`.
  const latestCommunication = [input.dissatisfiedReplyAt, input.lastCommunicationAt]
    .filter((value): value is Date => Boolean(value))
    .reduce<Date | undefined>(
      (latest, value) =>
        !latest || value.getTime() > latest.getTime() ? value : latest,
      undefined,
    );

  // Clause 10(1)(g) uses the later of the response-timeline expiry and the
  // regulated entity's last communication, then allows 90 days from that date.
  const lastCommunicationIsLater =
    latestCommunication &&
    latestCommunication.getTime() > responseTimelineExpiresAt.getTime();
  const deadlineAnchor = lastCommunicationIsLater
    ? latestCommunication
    : responseTimelineExpiresAt;

  return {
    responseTimelineDays,
    responseTimelineExpiresAt,
    eligibleFrom,
    fileBy: addCalendarDays(deadlineAnchor, RBI_OMBUDSMAN_2026.filingWindowDays),
    eligibilityBasis: replyCanOpenWindow
      ? "dissatisfied_reply"
      : "response_timeline_expired",
    deadlineBasis: lastCommunicationIsLater
      ? "last_communication"
      : "response_timeline_expiry",
    source: RBI_OMBUDSMAN_2026,
  };
}
