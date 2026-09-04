import { findCategory } from "@/lib/case/categories";
import { EMPTY_ENTITIES, type CaseFile, type Triage } from "@/lib/case/types";
import type { ReportDraft } from "./draft";

/**
 * Convert the reviewed local form into case data without re-classifying it or
 * filling gaps with guessed facts. A missing/unknown category is a hard stop:
 * downstream tracks and document routing depend on the citizen-confirmed one.
 */
export function reportDraftToCase(
  draft: ReportDraft,
  language: string,
  now = new Date(),
  context: { ageContext?: CaseFile["victim"]["ageContext"] } = {},
): Partial<CaseFile> | null {
  const category = findCategory(draft.categoryId);
  if (!category) return null;

  const incidentTime = draft.incidentAt ? new Date(draft.incidentAt).getTime() : Number.NaN;
  const incidentAt = Number.isFinite(incidentTime) ? draft.incidentAt : undefined;
  const minutesSinceIncident = incidentAt
    ? (now.getTime() - incidentTime) / 60_000
    : Number.POSITIVE_INFINITY;
  const urgency: Triage["urgency"] =
    category.portalTrack === "financial" && minutesSinceIncident >= 0 && minutesSinceIncident < 60
      ? "critical"
      : category.portalTrack === "financial" && minutesSinceIncident >= 0 && minutesSinceIncident < 1_440
        ? "high"
        : "moderate";
  const subcategoryId = category.subcategories.some((item) => item.id === draft.subcategoryId)
    ? draft.subcategoryId
    : undefined;
  const amount = typeof draft.amount === "number" && Number.isFinite(draft.amount) && draft.amount >= 0
    ? draft.amount
    : undefined;

  const valuesFor = (kind: string) => [
    ...new Set(
      draft.suspectIds
        .filter((item) => item.kind === kind)
        .map((item) => item.value.trim())
        .filter(Boolean),
    ),
  ];

  return {
    language,
    rawStatement: draft.narrative,
    triage: {
      categoryId: category.id,
      subcategoryId,
      // The review screen shows this category before the citizen accepts the
      // form. This value records that confirmation, not model confidence.
      confidence: 1,
      amount,
      incidentAt,
      rationale: "Category reviewed and confirmed by the citizen in this local form.",
      applicableTracks: [...category.tracks],
      urgency,
    },
    entities: {
      ...EMPTY_ENTITIES,
      upiIds: valuesFor("upi"),
      phones: valuesFor("phone"),
      accounts: valuesFor("account"),
      refs: valuesFor("ref"),
      urls: valuesFor("url"),
      emails: valuesFor("email"),
      handles: valuesFor("handle"),
      apps: draft.platform?.trim() ? [draft.platform.trim()] : [],
    },
    amount,
    incidentAt,
    victim: {
      name: draft.name,
      phone: draft.mobile,
      email: draft.email,
      state: draft.state,
      district: draft.district,
      address: draft.address,
      ageContext: context.ageContext,
    },
    suspect: {
      phones: valuesFor("phone"),
      upiIds: valuesFor("upi"),
      accounts: valuesFor("account"),
      urls: valuesFor("url"),
      handles: valuesFor("handle"),
    },
    evidenceText: draft.pastedText,
    // This form deliberately keeps metadata only. File bytes are added later
    // through the Evidence Vault, where successful storage can be verified.
    files: draft.files.map((file) => ({ name: file.name, size: file.size, type: file.type })),
  };
}
