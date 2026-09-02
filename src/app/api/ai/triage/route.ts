import { NextResponse } from "next/server";
import { jsonCall } from "@/lib/ai/provider";
import { TRIAGE_SCHEMA, TRIAGE_SYSTEM } from "@/lib/ai/prompts";
import { extractAmount, extractEntities, extractIncidentTime } from "@/lib/ai/extract";
import { ruleTriage } from "@/lib/ai/fallback";
import { findCategory } from "@/lib/case/categories";
import { getLanguage } from "@/lib/i18n/languages";
import type { Triage } from "@/lib/case/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body { text: string; lang?: string }

interface ModelTriage {
  categoryId: string; subcategoryId: string; confidence: number;
  amount: number | null; incidentAt: string | null;
  rationale: string; englishNarrative: string;
  urgency: "critical" | "high" | "moderate";
}

export async function POST(req: Request) {
  const { text, lang = "en" } = (await req.json()) as Body;
  if (!text || text.trim().length < 12) {
    return NextResponse.json({ error: "too-short" }, { status: 400 });
  }

  const now = new Date();
  // Regex first: identifiers are a solved problem and do not need a model.
  const entities = extractEntities(text);
  const rules = ruleTriage(text, now);

  const language = getLanguage(lang);
  const model = await jsonCall<ModelTriage>({
    system: TRIAGE_SYSTEM,
    user: `Current date and time in India: ${now.toISOString()}
The citizen is writing in: ${language.english}

Their account of what happened:
"""
${text.slice(0, 6000)}
"""

Identifiers a regular-expression pass already found (use them, do not contradict them):
${JSON.stringify(entities)}`,
    schema: TRIAGE_SCHEMA,
    schemaName: "triage",
    // Classification should not wander between two runs of the same sentence.
    // The citizen sees this category, corrects it, and every document is built
    // on it — so the same account of the same fraud must land in the same place.
    temperature: 0,
  });

  let triage: Triage;
  let source: "openai" | "rules";

  if (model && findCategory(model.categoryId)) {
    const cat = findCategory(model.categoryId)!;
    triage = {
      categoryId: model.categoryId,
      subcategoryId: model.subcategoryId,
      confidence: Math.max(0, Math.min(1, model.confidence)),
      // Trust the model's reading of "eighty five thousand", but never let it
      // erase a number the citizen actually typed.
      amount: model.amount ?? extractAmount(text),
      incidentAt: model.incidentAt || extractIncidentTime(text, now) || now.toISOString(),
      rationale: model.rationale,
      englishNarrative: model.englishNarrative,
      applicableTracks: cat.tracks,
      urgency: model.urgency,
    };
    source = "openai";
  } else {
    triage = rules;
    source = "rules";
  }

  return NextResponse.json({ triage, entities, source });
}
