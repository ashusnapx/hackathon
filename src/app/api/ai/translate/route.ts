import { NextResponse } from "next/server";
import { aiConfigured, jsonCall } from "@/lib/ai/provider";
import { TRANSLATE_SCHEMA, translateSystem } from "@/lib/ai/prompts";
import { claimAiProviderSlot, isJsonRecord, readAiJsonRequest } from "@/lib/ai/request-guard";

export const runtime = "nodejs";
export const maxDuration = 90;

/**
 * Used for AI-generated content only. The interface itself ships as a static
 * dictionary per language, because a citizen on 2G should not wait on a network
 * round trip to read a button label.
 */
export async function POST(req: Request) {
  const parsed = await readAiJsonRequest(req);
  if (
    !parsed.ok
  ) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  if (
    !isJsonRecord(parsed.value)
    || typeof parsed.value.text !== "string"
    || typeof parsed.value.target !== "string"
  ) return NextResponse.json({ error: "bad-request" }, { status: 400 });
  const text = parsed.value.text;
  const target = parsed.value.target;
  if (!text.trim() || !/^[a-z]{2,3}$/i.test(target)) {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }
  if (target === "en") return NextResponse.json({ translated: text, source: "passthrough" });

  const limit = aiConfigured ? claimAiProviderSlot(req) : { allowed: true, retryAfterSeconds: 0 };
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "rate-limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }
  const out = await jsonCall<{ translated: string }>({
    system: translateSystem(target),
    user: text.slice(0, 12000),
    schema: TRANSLATE_SCHEMA,
    schemaName: "translation",
  });

  if (!out) return NextResponse.json({ translated: null, source: "unavailable" });
  return NextResponse.json({ translated: out.translated, source: "openai" });
}
