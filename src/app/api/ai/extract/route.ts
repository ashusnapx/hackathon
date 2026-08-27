import { NextResponse } from "next/server";
import { jsonCall } from "@/lib/ai/provider";
import { EXTRACT_SCHEMA, EXTRACT_SYSTEM } from "@/lib/ai/prompts";
import { extractEntities } from "@/lib/ai/extract";

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
  const { text } = (await req.json()) as { text: string };
  if (!text?.trim()) return NextResponse.json({ error: "empty" }, { status: 400 });

  const regex = extractEntities(text);

  const model = await jsonCall<ModelExtract>({
    system: EXTRACT_SYSTEM,
    user: `Pasted evidence:
"""
${text.slice(0, 8000)}
"""

What the regular-expression pass found:
${JSON.stringify(regex, null, 2)}`,
    schema: EXTRACT_SCHEMA,
    schemaName: "extract",
  });

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
