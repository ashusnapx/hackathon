import { NextResponse } from "next/server";
import { jsonCall } from "@/lib/ai/provider";
import { TRANSLATE_SCHEMA, translateSystem } from "@/lib/ai/prompts";

export const runtime = "nodejs";
export const maxDuration = 90;

/**
 * Used for AI-generated content only. The interface itself ships as a static
 * dictionary per language, because a citizen on 2G should not wait on a network
 * round trip to read a button label.
 */
export async function POST(req: Request) {
  const { text, target } = (await req.json()) as { text: string; target: string };
  if (!text?.trim() || !target) return NextResponse.json({ error: "bad-request" }, { status: 400 });
  if (target === "en") return NextResponse.json({ translated: text, source: "passthrough" });

  const out = await jsonCall<{ translated: string }>({
    system: translateSystem(target),
    user: text.slice(0, 12000),
    schema: TRANSLATE_SCHEMA,
    schemaName: "translation",
  });

  if (!out) return NextResponse.json({ translated: null, source: "unavailable" });
  return NextResponse.json({ translated: out.translated, source: "openai" });
}
