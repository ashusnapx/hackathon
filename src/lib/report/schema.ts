/**
 * The National Cyber Crime Reporting Portal's complaint form, modelled field by
 * field — and then rebuilt around the person filling it in.
 *
 * Source of truth for the original is MHA's own Citizen Manual, "User Manual for
 * Reporting Cyber Crimes", v1.0, effective 30 Aug 2019, published at
 * cybercrime.gov.in/Webform/Citizen_Manual.aspx. Its Steps 2 to 7 are the four
 * tabs and roughly forty fields reproduced below.
 *
 * Two things are recorded against every field: whether the real portal makes it
 * mandatory, and whether we do. Where those differ there is a reason, and the
 * reason is written down. A citizen who has just lost their savings should not
 * have to produce their father's name before the complaint will save, and the
 * argument for that has to survive being read by someone who runs the portal.
 */

import type { DictKey } from "@/lib/i18n";

export type Stage = "incident" | "evidence" | "suspect" | "you" | "review";

export interface FieldSpec {
  id: string;
  /** i18n key for the question as we ask it. */
  labelKey: DictKey;
  /** Mandatory on the live portal, per the Citizen Manual. */
  ncrp: "required" | "optional" | "absent";
  /** What we do. "later" means we accept the draft without it and ask at submit. */
  kavach: "required" | "optional" | "later" | "derived";
  stage: Stage;
  /** Why the question exists at all, shown on demand rather than assumed. */
  whyKey?: DictKey;
  /** What the original does here, for the comparison view. */
  contrastKey?: DictKey;
}

/**
 * Ordered as the portal orders them, so the two can be read side by side.
 * The grouping into our own stages is the only re-arrangement.
 */
export const FIELDS: FieldSpec[] = [
  // ── Portal tab 1: Incident details ───────────────────────────────────────
  { id: "category", labelKey: "f.category", ncrp: "required", kavach: "derived", stage: "incident",
    whyKey: "f.category.why", contrastKey: "f.category.was" },
  { id: "subcategory", labelKey: "f.subcategory", ncrp: "required", kavach: "derived", stage: "incident",
    contrastKey: "f.subcategory.was" },
  { id: "incidentAt", labelKey: "f.incidentAt", ncrp: "required", kavach: "derived", stage: "incident",
    whyKey: "f.incidentAt.why", contrastKey: "f.incidentAt.was" },
  { id: "delayReason", labelKey: "f.delayReason", ncrp: "optional", kavach: "optional", stage: "incident",
    contrastKey: "f.delayReason.was" },
  { id: "platform", labelKey: "f.platform", ncrp: "required", kavach: "derived", stage: "incident",
    whyKey: "f.platform.why" },
  { id: "narrative", labelKey: "f.narrative", ncrp: "required", kavach: "required", stage: "incident",
    whyKey: "f.narrative.why", contrastKey: "f.narrative.was" },
  { id: "amount", labelKey: "f.amount", ncrp: "optional", kavach: "derived", stage: "incident" },

  // ── Portal tab 1 (continued): evidence ───────────────────────────────────
  { id: "evidence", labelKey: "f.evidence", ncrp: "required", kavach: "optional", stage: "evidence",
    whyKey: "f.evidence.why", contrastKey: "f.evidence.was" },
  { id: "pastedText", labelKey: "f.pastedText", ncrp: "absent", kavach: "optional", stage: "evidence",
    whyKey: "f.pastedText.why", contrastKey: "f.pastedText.was" },

  // ── Portal tab 2: Suspect details ────────────────────────────────────────
  { id: "suspectName", labelKey: "f.suspectName", ncrp: "optional", kavach: "optional", stage: "suspect" },
  { id: "suspectIds", labelKey: "f.suspectIds", ncrp: "optional", kavach: "derived", stage: "suspect",
    whyKey: "f.suspectIds.why", contrastKey: "f.suspectIds.was" },
  { id: "suspectAddress", labelKey: "f.suspectAddress", ncrp: "optional", kavach: "optional", stage: "suspect" },

  // ── Portal tab 3: Complainant details ────────────────────────────────────
  { id: "name", labelKey: "f.name", ncrp: "required", kavach: "later", stage: "you" },
  { id: "mobile", labelKey: "f.mobile", ncrp: "required", kavach: "later", stage: "you",
    whyKey: "f.mobile.why", contrastKey: "f.mobile.was" },
  { id: "email", labelKey: "f.email", ncrp: "optional", kavach: "optional", stage: "you" },
  { id: "gender", labelKey: "f.gender", ncrp: "required", kavach: "optional", stage: "you",
    contrastKey: "f.gender.was" },
  { id: "dob", labelKey: "f.dob", ncrp: "required", kavach: "optional", stage: "you" },
  { id: "guardianName", labelKey: "f.guardianName", ncrp: "required", kavach: "optional", stage: "you",
    whyKey: "f.guardianName.why", contrastKey: "f.guardianName.was" },
  { id: "relationship", labelKey: "f.relationship", ncrp: "optional", kavach: "optional", stage: "you" },
  { id: "nationalId", labelKey: "f.nationalId", ncrp: "required", kavach: "optional", stage: "you",
    whyKey: "f.nationalId.why", contrastKey: "f.nationalId.was" },
  { id: "nationality", labelKey: "f.nationality", ncrp: "required", kavach: "derived", stage: "you" },
  { id: "address", labelKey: "f.address", ncrp: "required", kavach: "optional", stage: "you" },
  { id: "state", labelKey: "f.state", ncrp: "required", kavach: "required", stage: "you",
    whyKey: "f.state.why" },
  { id: "district", labelKey: "f.district", ncrp: "required", kavach: "required", stage: "you" },
  { id: "policeStation", labelKey: "f.policeStation", ncrp: "optional", kavach: "derived", stage: "you",
    whyKey: "f.policeStation.why", contrastKey: "f.policeStation.was" },
  { id: "pincode", labelKey: "f.pincode", ncrp: "optional", kavach: "optional", stage: "you" },
];

export const STAGES: { id: Stage; labelKey: DictKey }[] = [
  { id: "incident", labelKey: "st.incident" },
  { id: "evidence", labelKey: "st.evidence" },
  { id: "suspect", labelKey: "st.suspect" },
  { id: "you", labelKey: "st.you" },
  { id: "review", labelKey: "st.review" },
];

export const fieldsFor = (stage: Stage) => FIELDS.filter((f) => f.stage === stage);

/** How many of the portal's mandatory fields we have made non-blocking. */
export const RELAXED_COUNT = FIELDS.filter(
  (f) => f.ncrp === "required" && (f.kavach === "optional" || f.kavach === "later" || f.kavach === "derived"),
).length;

export const NCRP_REQUIRED_COUNT = FIELDS.filter((f) => f.ncrp === "required").length;

/**
 * Documented failures of the live portal, each paired with what we do instead.
 *
 * Everything here is either from MHA's own Citizen Manual or from a first-hand
 * account we can point at. Nothing is inferred from a screenshot, because the
 * whole argument collapses the moment one item turns out to be unfair.
 */
export interface Friction {
  id: string;
  titleKey: DictKey;
  theirsKey: DictKey;
  oursKey: DictKey;
  /** Where the claim comes from, shown in the interface rather than a footnote. */
  sourceKey: DictKey;
}

export const FRICTIONS: Friction[] = [
  { id: "session", titleKey: "fr.session.t", theirsKey: "fr.session.a", oursKey: "fr.session.b", sourceKey: "fr.session.s" },
  { id: "login", titleKey: "fr.login.t", theirsKey: "fr.login.a", oursKey: "fr.login.b", sourceKey: "fr.login.s" },
  { id: "reset", titleKey: "fr.reset.t", theirsKey: "fr.reset.a", oursKey: "fr.reset.b", sourceKey: "fr.reset.s" },
  { id: "charset", titleKey: "fr.charset.t", theirsKey: "fr.charset.a", oursKey: "fr.charset.b", sourceKey: "fr.charset.s" },
  { id: "upload", titleKey: "fr.upload.t", theirsKey: "fr.upload.a", oursKey: "fr.upload.b", sourceKey: "fr.upload.s" },
  { id: "guardian", titleKey: "fr.guardian.t", theirsKey: "fr.guardian.a", oursKey: "fr.guardian.b", sourceKey: "fr.guardian.s" },
  { id: "delay", titleKey: "fr.delay.t", theirsKey: "fr.delay.a", oursKey: "fr.delay.b", sourceKey: "fr.delay.s" },
  { id: "notfir", titleKey: "fr.notfir.t", theirsKey: "fr.notfir.a", oursKey: "fr.notfir.b", sourceKey: "fr.notfir.s" },
];
