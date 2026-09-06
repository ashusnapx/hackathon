import { NextResponse } from "next/server";
import { aiConfigured, jsonCall } from "@/lib/ai/provider";
import { TRIAGE_SCHEMA, TRIAGE_SYSTEM } from "@/lib/ai/prompts";
import { claimAiProviderSlot, isJsonRecord, readAiJsonRequest } from "@/lib/ai/request-guard";
import { extractAmount, extractEntities, extractIncidentTime } from "@/lib/ai/extract";
import { ruleTriage } from "@/lib/ai/fallback";
import { findCategory } from "@/lib/case/categories";
import { getLanguage } from "@/lib/i18n/languages";
import { chooseIncidentAt, triageUrgency } from "@/lib/ai/triage-safety";
import type { Triage } from "@/lib/case/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ModelTriage {
  categoryId: string; subcategoryId: string; confidence: number;
  amount: number | null; incidentAt: string | null;
  rationale: string; englishNarrative: string;
  urgency: "critical" | "high" | "moderate";
  callerName: string | null; bankName: string | null;
}

/** A model that has nothing to say here returns null, "", or the word unknown. */
function clean(value: string | null | undefined): string | undefined {
  const text = value?.trim();
  if (!text || text.length > 120) return undefined;
  return /^(unknown|n\/a|none|not stated|not mentioned)$/i.test(text) ? undefined : text;
}

export async function POST(req: Request) {
  const parsed = await readAiJsonRequest(req);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }
  if (!isJsonRecord(parsed.value) || typeof parsed.value.text !== "string") {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }
  const { text } = parsed.value;
  const lang = typeof parsed.value.lang === "string" ? parsed.value.lang.slice(0, 16) : "en";
  if (!text || text.trim().length < 12) {
    return NextResponse.json({ error: "too-short" }, { status: 400 });
  }

  const now = new Date();
  // Regex first: identifiers are a solved problem and do not need a model.
  const entities = extractEntities(text);
  const rules = ruleTriage(text, now);

  const language = getLanguage(lang);
  const limit = aiConfigured ? claimAiProviderSlot(req) : { allowed: true, retryAfterSeconds: 0 };
  const model = limit.allowed ? await jsonCall<ModelTriage>({
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
  }) : null;

  let triage: Triage;
  let source: "openai" | "rules";

  if (model && findCategory(model.categoryId)) {
    const cat = findCategory(model.categoryId)!;
    const incidentAt = chooseIncidentAt(model.incidentAt, extractIncidentTime(text, now), now);
    triage = {
      categoryId: model.categoryId,
      subcategoryId: model.subcategoryId,
      confidence: Math.max(0, Math.min(1, model.confidence)),
      // Trust the model's reading of "eighty five thousand", but never let it
      // erase a number the citizen actually typed.
      amount: model.amount ?? extractAmount(text),
      incidentAt,
      rationale: model.rationale,
      englishNarrative: model.englishNarrative,
      applicableTracks: cat.tracks,
      urgency: triageUrgency(cat.portalTrack === "financial", incidentAt, now),
    };
    source = "openai";
  } else {
    triage = rules;
    source = "rules";
  }

  // Handed back beside the triage rather than inside it: they are facts about
  // the person, not a classification of the fraud, and the interview uses them
  // only to stop asking for what it has already been told.
  const said = model && source === "openai"
    ? { callerName: clean(model.callerName), bankName: clean(model.bankName) }
    : {};

  return NextResponse.json({ triage, entities, source, ...said });
}
