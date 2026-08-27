import { NextResponse } from "next/server";
import { jsonCall } from "@/lib/ai/provider";
import { DRAFT_SCHEMA, DRAFT_SYSTEM } from "@/lib/ai/prompts";
import { padToMinimum, ruleDocs, sanitiseForNcrp } from "@/lib/ai/fallback";
import { findCategory, findSubcategory } from "@/lib/case/categories";
import type { CaseFile } from "@/lib/case/types";

export const runtime = "nodejs";
export const maxDuration = 120;

interface Drafts {
  ncrp: string; script: string; bank: string; fir: string; chakshu: string; mrm: string; ombudsman: string;
}

export async function POST(req: Request) {
  const { caseFile } = (await req.json()) as { caseFile: CaseFile };
  if (!caseFile) return NextResponse.json({ error: "no-case" }, { status: 400 });

  const cat = findCategory(caseFile.triage?.categoryId);
  const sub = findSubcategory(caseFile.triage?.categoryId, caseFile.triage?.subcategoryId);

  const brief = {
    today: new Date().toISOString(),
    category: cat?.label,
    subcategory: sub?.label,
    isFinancial: cat?.portalTrack === "financial",
    incidentAt: caseFile.incidentAt || caseFile.triage?.incidentAt,
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
  };

  const model = await jsonCall<Drafts>({
    system: DRAFT_SYSTEM,
    user: `Write all seven documents for this case.

Anything below that is missing or empty must appear in the documents as a square-bracketed placeholder, never as an invented value.

${JSON.stringify(brief, null, 2)}`,
    schema: DRAFT_SCHEMA,
    schemaName: "drafts",
  });

  if (!model) {
    return NextResponse.json({ docs: ruleDocs(caseFile), source: "rules" });
  }

  // The portal's character rules are not negotiable, so we enforce them on the
  // way out regardless of what the model produced.
  const ncrp = padToMinimum(sanitiseForNcrp(model.ncrp), caseFile);

  return NextResponse.json({ docs: { ...model, ncrp }, source: "openai" });
}
