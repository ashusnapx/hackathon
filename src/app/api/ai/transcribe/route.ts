import { NextResponse } from "next/server";
import { transcribe } from "@/lib/ai/provider";
import { getLanguage } from "@/lib/i18n/languages";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Server-side transcription. The browser's own SpeechRecognition covers the big
 * languages on Chrome, but it is absent on most Android WebViews and has no
 * support at all for Santali or Bodo — so audio comes here instead.
 */
export async function POST(req: Request) {
  const form = await req.formData();
  const audio = form.get("audio");
  const lang = String(form.get("lang") || "en");

  if (!(audio instanceof Blob)) return NextResponse.json({ error: "no-audio" }, { status: 400 });
  if (audio.size > 25 * 1024 * 1024) return NextResponse.json({ error: "too-large" }, { status: 413 });

  const text = await transcribe(audio, getLanguage(lang).code);
  if (!text) return NextResponse.json({ text: null, source: "unavailable" });
  return NextResponse.json({ text, source: "openai" });
}
