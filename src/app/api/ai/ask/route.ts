import { NextResponse } from "next/server";
import { textCall } from "@/lib/ai/provider";
import { askSystem } from "@/lib/ai/prompts";
import { completeness, liveTracks, nextAction } from "@/lib/case/tracks";
import { findCategory } from "@/lib/case/categories";
import type { CaseFile } from "@/lib/case/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { question, caseFile, lang = "en" } = (await req.json()) as {
    question: string; caseFile: CaseFile; lang?: string;
  };
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

  const answer = await textCall(askSystem(lang), `${context}\n\nTheir question:\n${question.slice(0, 1000)}`);

  if (!answer) {
    return NextResponse.json({
      answer: null,
      source: "unavailable",
      fallback: next
        ? `The most useful thing you can do right now is the step marked "${next.def.id}" on your case page.`
        : null,
    });
  }
  return NextResponse.json({ answer, source: "openai" });
}
