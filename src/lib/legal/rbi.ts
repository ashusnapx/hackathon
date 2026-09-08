/**
 * A conservative screening layer for RBI/2017-18/15.
 *
 * This deliberately accepts facts the citizen has explicitly answered. It does
 * not accept an NCRP/cyber-fraud category: being deceived into making a payment
 * is not, by itself, the same thing as an unauthorised electronic transaction.
 * The result says which route in the circular the answers fit; it is not a
 * finding of fact and does not replace the bank's liability determination.
 *
 * Two links, on purpose. The circular is the citation — it is what a bank's
 * grievance desk answers to, and it is still in force. But sending somebody who
 * has just lost their savings to a 2017 circular index page is sending them
 * somewhere written for compliance officers, and RBI's own site frames it under
 * a menu heading of "Circulars Withdrawn", which reads as though the protection
 * itself has been taken away. `readableUrl` is RBI's page on the same rules
 * written for the public, and it is what the citizen is shown.
 */

export const RBI_2017_CIRCULAR = {
  id: "RBI/2017-18/15",
  number: "DBR.No.Leg.BC.78/09.07.005/2017-18",
  issuedOn: "2017-07-06",
  title: "Customer Protection – Limiting Liability of Customers in Unauthorised Electronic Banking Transactions",
  /** The circular itself, for a bank or an officer who wants the citation. */
  url: "https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=11040&Mode=0",
  /** RBI's own explanation of the same rules, written for a customer. */
  readableUrl: "https://www.rbi.org.in/commonperson/English/scripts/Limitedliability.aspx",
  /**
   * No longer a draft.
   *
   * The amendments RBI put out for comment in March 2026 were finalised on
   * 24 June 2026 and apply to transactions from 1 January 2027 — see
   * `RBI_2026_AMENDMENT` below. Until that date this circular is the framework
   * in force, which is why it is still the one the screening runs; after it, a
   * different set of numbers applies to the same question.
   */
  underRevision: true,
  supersededFrom: "2027-01-01",
} as const;

/**
 * The framework that replaces the one above, for transactions from 2027.
 *
 * Kept as data rather than prose because the dates matter more than the
 * summary: somebody defrauded on 31 December 2026 and somebody defrauded on
 * 1 January 2027 are owed different things by their bank, and a page that
 * quoted only one of the two regimes would be wrong for half its readers for
 * months.
 *
 * The reporting window moves from three *working* days to five *calendar* days,
 * which is not the simplification it looks like: for a fraud discovered on a
 * Friday before a long weekend the calendar version is the tighter deadline.
 * That is exactly the kind of change a victim cannot be expected to track, and
 * is the reason this is dated rather than swapped in.
 *
 * Verified against RBI's own press release and notification, not a summary of
 * them. Figures below are from the Commercial Banks amendment; the parallel
 * amendments for small finance, payments, local area, regional rural and
 * co-operative banks were issued the same day.
 */
export const RBI_2026_AMENDMENT = {
  id: "RBI/2026-27/167",
  number: "DOR.MCS.REC.No.130/01-01-032/2026-27",
  title: "Reserve Bank of India (Commercial Banks – Responsible Business Conduct) Third Amendment Directions, 2026",
  issuedOn: "2026-06-24",
  /** Applies to electronic banking transactions undertaken on or after this. */
  appliesFrom: "2027-01-01",
  url: "https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=13543&Mode=0",
  pressReleaseUrl: "https://www.rbi.org.in/scripts/BS_PressReleaseDisplay.aspx?prid=63011",
  /** Zero liability on a third-party breach if reported within this window. */
  reportWithinCalendarDays: 5,
  /** Shadow reversal, counted from the customer's notification. */
  shadowReversalCalendarDays: 5,
  resolutionCalendarDays: { domestic: 45, crossBorder: 60 },
  /**
   * New: a one-per-lifetime compensation route for small-value fraud, which is
   * conditional on having reported to 1930/NCRP *and* the bank within five
   * calendar days — a reason the helpline track matters even when the amount
   * looks too small to chase.
   */
  smallValue: {
    maxLossRupees: 50_000,
    shareOfNetLoss: 0.85,
    capRupees: 25_000,
    oncePerLifetime: true,
  },
} as const;

/**
 * Which framework governs a transaction.
 *
 * Takes the date of the disputed transaction, not today's date: the regime is
 * fixed by when the money moved, and a case opened in February 2027 about a
 * December 2026 debit is still governed by the 2017 circular.
 */
export function rbiFrameworkFor(transactionAt: Date | string | undefined): "2017" | "2026" {
  if (!transactionAt) return "2017";
  const at = typeof transactionAt === "string" ? new Date(transactionAt) : transactionAt;
  if (Number.isNaN(at.getTime())) return "2017";
  return at.getTime() >= Date.parse(RBI_2026_AMENDMENT.appliesFrom) ? "2026" : "2017";
}

export type RbiInitiation = "victim" | "unknown" | "not-victim";
export type RbiYesNoUnknown = "yes" | "no" | "unknown";
export type RbiReportTiming =
  | "within_3_working_days"
  | "four_to_seven_working_days"
  | "after_7_working_days"
  | "not_reported"
  | "unknown";

export interface RbiEligibilityInput {
  /** Who initiated or approved the disputed transaction? */
  initiation: RbiInitiation;
  /** Did sharing a credential cause or enable the disputed loss? Legacy field name retained for saved drafts. */
  credentialsShared: RbiYesNoUnknown;
  /** Does the victim suspect fraud, negligence or a deficiency at the bank? */
  suspectedBankFault: RbiYesNoUnknown;
  /** Time from receiving the bank's communication to notifying the bank. */
  reportTiming: RbiReportTiming;
}

export type RbiEligibilityStatus = "eligible" | "possibly_eligible" | "not_eligible" | "unknown";

/**
 * `status` answers whether the facts fit a protection route. `protection` keeps
 * that separate from the much stronger question of zero liability.
 */
export type RbiProtection =
  | "zero_liability"
  | "limited_liability"
  | "bank_policy"
  | "post_report_loss_only"
  | "not_applicable"
  | "undetermined";

export type RbiInputField = keyof RbiEligibilityInput;

export interface RbiProvenance {
  rule:
    | "unauthorised_scope"
    | "bank_fault"
    | "customer_negligence"
    | "third_party_timing"
    | "report_immediately"
    | "burden_of_proof";
  /** Paragraph numbers in RBI/2017-18/15 supporting this reason. */
  sourceParagraphs: readonly string[];
  inputFields: readonly RbiInputField[];
}

export interface RbiEligibilityAssessment {
  status: RbiEligibilityStatus;
  protection: RbiProtection;
  /** Citizen-facing explanations, with no conclusion stronger than the inputs. */
  reasons: string[];
  /** Machine-readable trail from each conclusion to the circular and answers. */
  provenance: RbiProvenance[];
  missingAnswers: RbiInputField[];
  source: typeof RBI_2017_CIRCULAR;
}

type Decision = Pick<RbiEligibilityAssessment, "status" | "protection">;
const RBI_INPUT_FIELDS = [
  "initiation",
  "credentialsShared",
  "suspectedBankFault",
  "reportTiming",
] as const satisfies readonly RbiInputField[];

/**
 * Screen explicit answers against paragraphs 5–8 and 12 of the 2017 circular.
 *
 * "Eligible" means that the answers fit a route described by the circular. The
 * bank still determines the facts, and paragraph 12 places the burden of proving
 * customer liability on the bank.
 */
export function assessRbiEligibility(input: RbiEligibilityInput): RbiEligibilityAssessment {
  const reasons: string[] = [];
  const provenance: RbiProvenance[] = [];
  const missingAnswers = RBI_INPUT_FIELDS.filter((field) => input[field] === "unknown");

  const explain = (
    text: string,
    rule: RbiProvenance["rule"],
    sourceParagraphs: readonly string[],
    inputFields: readonly RbiInputField[],
  ) => {
    reasons.push(text);
    provenance.push({ rule, sourceParagraphs, inputFields });
  };

  const finish = ({ status, protection }: Decision): RbiEligibilityAssessment => ({
    status,
    protection,
    reasons,
    provenance,
    missingAnswers,
    source: RBI_2017_CIRCULAR,
  });

  // The circular is limited to unauthorised transactions. A scam-induced but
  // victim-approved transfer may have other remedies, but this circular cannot
  // be made to fit merely because the surrounding event was cyber fraud.
  if (input.initiation === "victim") {
    explain(
      "You said you initiated or approved this payment. The 2017 circular applies to unauthorised electronic banking transactions, so this screening cannot place that payment in its liability framework.",
      "unauthorised_scope",
      ["2", "6", "7"],
      ["initiation"],
    );
    return finish({ status: "not_eligible", protection: "not_applicable" });
  }

  if (input.initiation === "unknown") {
    explain(
      "It is not yet clear whether you initiated or approved the transaction. That fact must be confirmed before the unauthorised-transaction circular can be applied.",
      "unauthorised_scope",
      ["2", "6", "7"],
      ["initiation"],
    );
    return finish({ status: "unknown", protection: "undetermined" });
  }

  explain(
    "You said you did not initiate or approve the transaction, so it can be screened under the RBI framework for unauthorised electronic banking transactions.",
    "unauthorised_scope",
    ["2", "6", "7"],
    ["initiation"],
  );

  if (input.reportTiming === "not_reported") {
    explain(
      "Report the disputed transaction to the bank immediately through a channel that gives an acknowledgement. The circular says delay increases the risk of loss and requires banks to provide 24x7 reporting channels.",
      "report_immediately",
      ["5"],
      ["reportTiming"],
    );
  }

  // A suspected bank deficiency may lead to zero liability under paragraph
  // 6(i), but suspicion is not a finding. Conflicting or missing facts therefore
  // stay explicitly uncertain.
  if (input.credentialsShared === "yes") {
    explain(
      "You said sharing a payment credential appears to have caused or enabled the disputed transaction. Paragraph 7(i) applies only to loss caused by customer negligence; the bank still has to establish that causal link and bears the burden of proving customer liability.",
      "customer_negligence",
      ["7(i)", "9", "12"],
      ["credentialsShared", "reportTiming"],
    );

    if (input.suspectedBankFault === "yes") {
      explain(
        "You also suspect a bank-side fault. If the bank's contributory fraud, negligence or deficiency is established, paragraph 6(i) provides a separate zero-liability route, so the present answers need investigation rather than a definite conclusion.",
        "bank_fault",
        ["6(i)", "12"],
        ["suspectedBankFault"],
      );
      return finish({ status: "possibly_eligible", protection: "undetermined" });
    }

    if (input.suspectedBankFault === "unknown") {
      explain(
        "Whether the bank contributed to the transaction is still unknown, so a bank-fault route cannot yet be ruled in or out.",
        "bank_fault",
        ["6(i)", "12"],
        ["suspectedBankFault"],
      );
      return finish({ status: "unknown", protection: "undetermined" });
    }

    explain(
      "If the bank proves that customer negligence caused the loss and no bank-side fault is established, paragraph 7(i) ordinarily places that loss with the customer until the bank is notified and places later unauthorised loss with the bank. This screening is not that factual finding, and another route may apply if causation is not established.",
      "customer_negligence",
      ["7(i)", "9", "12"],
      ["credentialsShared", "suspectedBankFault", "reportTiming"],
    );
    return finish({ status: "possibly_eligible", protection: "post_report_loss_only" });
  }

  if (input.credentialsShared === "unknown") {
    explain(
      "It is not yet known whether sharing a payment credential caused or enabled the disputed transaction. Paragraph 7(i) requires loss caused by customer negligence, so that causal fact is needed before liability can be screened safely.",
      "customer_negligence",
      ["7(i)"],
      ["credentialsShared"],
    );

    if (input.suspectedBankFault === "yes") {
      explain(
        "A bank-side fault is suspected. If it is established, paragraph 6(i) provides zero liability irrespective of when the transaction was reported, but this screening cannot treat a suspicion as proof.",
        "bank_fault",
        ["6(i)", "12"],
        ["suspectedBankFault"],
      );
      return finish({ status: "possibly_eligible", protection: "undetermined" });
    }

    return finish({ status: "unknown", protection: "undetermined" });
  }

  // At this point the citizen says the transaction was not initiated by them and
  // no credential was shared. Reporting time determines the third-party route.
  if (input.reportTiming === "within_3_working_days") {
    explain(
      "You said the bank was notified within three working days of its transaction communication. If the investigation finds that neither you nor the bank was at fault, paragraph 6(ii) provides zero liability; established bank fault is separately covered by paragraph 6(i).",
      "third_party_timing",
      ["6(i)", "6(ii)", "8"],
      ["credentialsShared", "suspectedBankFault", "reportTiming"],
    );
    explain(
      "Working days are counted using your home branch's working schedule, excluding the day you received the bank's communication.",
      "third_party_timing",
      ["8"],
      ["reportTiming"],
    );
    explain(
      "The bank bears the burden of proving customer liability.",
      "burden_of_proof",
      ["12"],
      [],
    );
    return finish({ status: "eligible", protection: "zero_liability" });
  }

  if (input.reportTiming === "four_to_seven_working_days") {
    if (input.suspectedBankFault !== "no") {
      explain(
        input.suspectedBankFault === "yes"
          ? "A bank-side fault is suspected. If established, paragraph 6(i) provides zero liability; otherwise a third-party breach reported in four to seven working days falls under paragraph 7(ii)'s limited-liability route."
          : "It is not known whether there was a bank-side fault. An established bank fault would lead to the paragraph 6(i) route; otherwise a qualifying third-party breach reported in four to seven working days falls under paragraph 7(ii)'s limited-liability route.",
        "bank_fault",
        ["6(i)", "7(ii)", "12"],
        ["suspectedBankFault", "reportTiming"],
      );
      return finish({ status: "possibly_eligible", protection: "undetermined" });
    }

    explain(
      "For a third-party breach reported in four to seven working days, customer liability is capped at the transaction value or the applicable amount in Table 1, whichever is lower. This is limited liability, not zero liability.",
      "third_party_timing",
      ["7(ii)", "8"],
      ["credentialsShared", "suspectedBankFault", "reportTiming"],
    );
    explain(
      "Working days are counted using your home branch's working schedule, excluding the day you received the bank's communication.",
      "third_party_timing",
      ["8"],
      ["reportTiming"],
    );
    explain(
      "The bank bears the burden of proving customer liability.",
      "burden_of_proof",
      ["12"],
      [],
    );
    return finish({ status: "eligible", protection: "limited_liability" });
  }

  if (input.reportTiming === "after_7_working_days") {
    if (input.suspectedBankFault !== "no") {
      explain(
        input.suspectedBankFault === "yes"
          ? "A bank-side fault is suspected. If established, paragraph 6(i) provides zero liability irrespective of reporting time; if it is not established, reporting after seven working days is governed by the bank's Board-approved policy."
          : "It is not known whether there was a bank-side fault. An established bank fault would lead to paragraph 6(i); otherwise reporting after seven working days is governed by the bank's Board-approved policy.",
        "bank_fault",
        ["6(i)", "7(ii)", "8", "12"],
        ["suspectedBankFault", "reportTiming"],
      );
      return finish({ status: "possibly_eligible", protection: "undetermined" });
    } else {
      explain(
        "For a third-party breach reported after seven working days, the circular leaves customer liability to the bank's published Board-approved policy. It does not guarantee zero liability or a fixed cap.",
        "third_party_timing",
        ["7(ii)", "8", "11"],
        ["credentialsShared", "suspectedBankFault", "reportTiming"],
      );
    }
    return finish({ status: "possibly_eligible", protection: "bank_policy" });
  }

  if (input.reportTiming === "not_reported") {
    if (input.suspectedBankFault === "yes") {
      explain(
        "A bank-side fault is suspected and could provide a zero-liability route if established, but it has not been established here.",
        "bank_fault",
        ["6(i)", "12"],
        ["suspectedBankFault"],
      );
      return finish({ status: "possibly_eligible", protection: "undetermined" });
    }
    return finish({ status: "unknown", protection: "undetermined" });
  }

  explain(
    "The time between receiving the bank's transaction communication and notifying the bank is unknown. That timing is required to distinguish zero liability, limited liability and the bank-policy route.",
    "third_party_timing",
    ["6(ii)", "7(ii)", "8"],
    ["reportTiming"],
  );
  if (input.suspectedBankFault === "yes") {
    explain(
      "A bank-side fault is suspected and could provide a zero-liability route if established, but the reporting-time answer is still needed if bank fault is not established.",
      "bank_fault",
      ["6(i)", "6(ii)", "7(ii)", "12"],
      ["suspectedBankFault", "reportTiming"],
    );
    return finish({ status: "possibly_eligible", protection: "undetermined" });
  }
  return finish({ status: "unknown", protection: "undetermined" });
}
