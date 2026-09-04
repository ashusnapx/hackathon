import { NextResponse } from "next/server";
import { aiConfigured, jsonCall } from "@/lib/ai/provider";
import { EXTRACT_SCHEMA, EXTRACT_SYSTEM } from "@/lib/ai/prompts";
import { extractEntities } from "@/lib/ai/extract";
import { claimAiProviderSlot, isJsonRecord, readAiJsonRequest } from "@/lib/ai/request-guard";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ModelExtract {
  suspectPhones: string[]; suspectUpiIds: string[]; suspectAccounts: string[];
  suspectUrls: string[]; suspectHandles: string[]; refs: string[];
  amount: number | null; bankName: string | null; victimAccountLast4: string | null;
  summary: string;
}

const uniq = (a: string[], b: string[]) => Array.from(new Set([...a, ...b])).filter(Boolean);

export async function POST(req: Request) {
  const parsed = await readAiJsonRequest(req);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }
  if (!isJsonRecord(parsed.value) || typeof parsed.value.text !== "string") {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }
  const text = parsed.value.text;
  if (!text?.trim()) return NextResponse.json({ error: "empty" }, { status: 400 });

  const regex = extractEntities(text);

  const limit = aiConfigured ? claimAiProviderSlot(req) : { allowed: true, retryAfterSeconds: 0 };
  const model = limit.allowed ? await jsonCall<ModelExtract>({
    system: EXTRACT_SYSTEM,
    user: `Pasted evidence:
"""
${text.slice(0, 8000)}
"""

What the regular-expression pass found:
${JSON.stringify(regex, null, 2)}`,
    schema: EXTRACT_SCHEMA,
    schemaName: "extract",
  }) : null;

  if (!model) {
    // Without a model we cannot tell victim identifiers from suspect ones, so we
    // return everything found and let the citizen confirm on screen.
    return NextResponse.json({
      suspect: {
        phones: regex.phones, upiIds: regex.upiIds, accounts: regex.accounts,
        urls: regex.urls, handles: regex.handles,
      },
      refs: regex.refs, amount: null, bankName: null, victimAccountLast4: null,
      summary: null, source: "rules", needsReview: true,
      ...(limit.allowed ? {} : { rateLimited: true, retryAfterSeconds: limit.retryAfterSeconds }),
    });
  }

  return NextResponse.json({
    suspect: {
      phones: uniq(model.suspectPhones, []),
      upiIds: uniq(model.suspectUpiIds, []),
      accounts: uniq(model.suspectAccounts, []),
      urls: uniq(model.suspectUrls, []),
      handles: uniq(model.suspectHandles, []),
    },
    refs: uniq(model.refs, regex.refs),
    amount: model.amount,
    bankName: model.bankName,
    victimAccountLast4: model.victimAccountLast4,
    summary: model.summary,
    source: "openai",
    needsReview: false,
  });
}
