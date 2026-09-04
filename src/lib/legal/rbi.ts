/**
 * A conservative screening layer for RBI/2017-18/15.
 *
 * This deliberately accepts facts the citizen has explicitly answered. It does
 * not accept an NCRP/cyber-fraud category: being deceived into making a payment
 * is not, by itself, the same thing as an unauthorised electronic transaction.
 * The result says which route in the circular the answers fit; it is not a
 * finding of fact and does not replace the bank's liability determination.
 *
 * Official source:
 * https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=11040&Mode=0
 */

export const RBI_2017_CIRCULAR = {
  id: "RBI/2017-18/15",
  number: "DBR.No.Leg.BC.78/09.07.005/2017-18",
  issuedOn: "2017-07-06",
  title: "Customer Protection – Limiting Liability of Customers in Unauthorised Electronic Banking Transactions",
  url: "https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=11040&Mode=0",
} as const;

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
