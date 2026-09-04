import { NextResponse } from "next/server";
import { aiConfigured, textCall } from "@/lib/ai/provider";
import { askSystem } from "@/lib/ai/prompts";
import { isCaseFilePayload } from "@/lib/ai/case-payload";
import { claimAiProviderSlot, isJsonRecord, readAiJsonRequest } from "@/lib/ai/request-guard";
import { completeness, liveTracks, nextAction } from "@/lib/case/tracks";
import { findCategory } from "@/lib/case/categories";
import type { CaseFile } from "@/lib/case/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const parsed = await readAiJsonRequest(req);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }
  if (!isJsonRecord(parsed.value) || typeof parsed.value.question !== "string") {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }
  const question = parsed.value.question;
  const lang = typeof parsed.value.lang === "string" ? parsed.value.lang.slice(0, 16) : "en";
  let caseFile: CaseFile | null = null;
  if (parsed.value.caseFile !== undefined && parsed.value.caseFile !== null) {
    if (!isCaseFilePayload(parsed.value.caseFile)) {
      return NextResponse.json({ error: "bad-case" }, { status: 400 });
    }
    caseFile = parsed.value.caseFile;
  }
  if (!question?.trim()) return NextResponse.json({ error: "empty" }, { status: 400 });

  const tracks = caseFile ? liveTracks(caseFile) : [];
  const next = caseFile ? nextAction(caseFile) : null;

  const context = caseFile
    ? `Their case file:
- Category: ${findCategory(caseFile.triage?.categoryId)?.label ?? "not yet classified"}
- Amount lost: ${caseFile.amount ? `Rs. ${caseFile.amount.toLocaleString("en-IN")}` : "not given"}
- Incident: ${caseFile.incidentAt ?? "not given"}
- Bank: ${caseFile.bank.name ?? "not given"}${caseFile.bank.notifiedAt ? `, notified in writing on ${caseFile.bank.notifiedAt}` : ", NOT yet notified in writing"}
- Case completeness: ${completeness(caseFile).score} percent
- Track status: ${tracks.map((t) => `${t.def.id}=${t.state}`).join(", ")}
- The single next thing they should do: ${next?.def.id ?? "nothing is currently due"}`
    : "They have not created a case file yet.";

  const limit = aiConfigured ? claimAiProviderSlot(req) : { allowed: true, retryAfterSeconds: 0 };
  const answer = limit.allowed
    ? await textCall(askSystem(lang), `${context}\n\nTheir question:\n${question.slice(0, 1000)}`)
    : null;

  if (!answer) {
    return NextResponse.json({
      answer: null,
      source: limit.allowed ? "unavailable" : "rate-limited",
      fallback: next
        ? `The most useful thing you can do right now is the step marked "${next.def.id}" on your case page.`
        : null,
      ...(limit.allowed ? {} : { retryAfterSeconds: limit.retryAfterSeconds }),
    });
  }
  return NextResponse.json({ answer, source: "openai" });
}
