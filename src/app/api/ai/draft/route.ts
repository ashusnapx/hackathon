import { NextResponse } from "next/server";
import { aiConfigured, jsonCall } from "@/lib/ai/provider";
import { DRAFT_SYSTEM } from "@/lib/ai/prompts";
import { isCaseFilePayload } from "@/lib/ai/case-payload";
import { claimAiProviderSlot, isJsonRecord, readAiJsonRequest } from "@/lib/ai/request-guard";
import { padToMinimum, ruleDocs, sanitiseForNcrp } from "@/lib/ai/fallback";
import { modelDraftsContradictPaymentAnswer } from "@/lib/ai/document-safety";
import { findCategory, findSubcategory } from "@/lib/case/categories";
import {
  applicableDocumentKeys,
  pickApplicableDocuments,
  type DocumentKey,
} from "@/lib/case/documents";

export const runtime = "nodejs";
export const maxDuration = 120;

type Drafts = Partial<Record<DocumentKey, string>>;

export async function POST(req: Request) {
  const parsed = await readAiJsonRequest(req);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }
  if (!isJsonRecord(parsed.value) || !isCaseFilePayload(parsed.value.caseFile)) {
    return NextResponse.json({ error: "no-case" }, { status: 400 });
  }
  const caseFile = parsed.value.caseFile;

  const cat = findCategory(caseFile.triage?.categoryId);
  const sub = findSubcategory(caseFile.triage?.categoryId, caseFile.triage?.subcategoryId);
  const requestedDocuments = applicableDocumentKeys(caseFile);
  const schema = {
    type: "object",
    additionalProperties: false,
    required: requestedDocuments,
    properties: Object.fromEntries(
      requestedDocuments.map((key) => [key, { type: "string" }]),
    ),
  };

  const brief = {
    today: new Date().toISOString(),
    category: cat?.label,
    subcategory: sub?.label,
    isFinancial: cat?.portalTrack === "financial",
    incidentAt: caseFile.incidentAt || caseFile.triage?.incidentAt,
    incidentTimingRange: caseFile.incidentTimingRange,
    bankAlertAt: caseFile.bankAlertAt,
    amount: caseFile.amount,
    whatHappenedInTheirWords: caseFile.rawStatement,
    whatHappenedInEnglish: caseFile.triage?.englishNarrative,
    victim: caseFile.victim,
    bank: caseFile.bank,
    suspect: caseFile.suspect,
    transactions: caseFile.txns,
    identifiersFound: caseFile.entities,
    evidenceFiles: caseFile.files.map((f) => f.name),
    rbiUnauthorisedTransactionScreening: caseFile.legal?.rbi,
    userMarkedSteps: caseFile.tracks.map((track) => ({
      id: track.id,
      markedAt: track.doneAt,
      reference: track.ref,
    })),
    requestedDocuments,
  };

  const limit = aiConfigured ? claimAiProviderSlot(req) : { allowed: true, retryAfterSeconds: 0 };
  const model = limit.allowed ? await jsonCall<Drafts>({
    system: DRAFT_SYSTEM,
    user: `Write exactly the requested document types for this case: ${requestedDocuments.join(", ")}.

Anything below that is missing or empty must appear in the documents as a square-bracketed placeholder, never as an invented value.

${JSON.stringify(brief, null, 2)}`,
    schema,
    schemaName: "drafts",
  }) : null;

  if (!model) {
    return NextResponse.json({
      docs: ruleDocs(caseFile),
      source: "rules",
      ...(limit.allowed ? {} : { rateLimited: true, retryAfterSeconds: limit.retryAfterSeconds }),
    });
  }

  // The portal's character rules are not negotiable, so we enforce them on the
  // way out regardless of what the model produced.
  const selected = pickApplicableDocuments(caseFile, model);
  if (modelDraftsContradictPaymentAnswer(caseFile, selected)) {
    return NextResponse.json({ docs: ruleDocs(caseFile), source: "rules" });
  }
  if (selected.ncrp) selected.ncrp = padToMinimum(sanitiseForNcrp(selected.ncrp), caseFile);

  return NextResponse.json({ docs: selected, source: "openai" });
}
