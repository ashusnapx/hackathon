import { NextResponse } from "next/server";
import { isGemini, transcribe } from "@/lib/ai/provider";
import { getLanguage } from "@/lib/i18n/languages";
import {
  MAX_TRANSCRIPTION_AUDIO_BYTES,
  claimTranscriptionSlot,
  guardTranscriptionRequest,
} from "@/lib/ai/transcribe-guard";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Server-side transcription. The browser's own SpeechRecognition covers the big
 * languages on Chrome, but it is absent on most Android WebViews and has no
 * support at all for Santali or Bodo — so audio comes here instead.
 */
export async function POST(req: Request) {
  const guard = guardTranscriptionRequest(req);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  // This trusts the deployment's forwarding proxy, like the Vaani prototype
  // guard. Production must replace it with a shared edge/WAF rate limiter.
  const clientKey = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown-client";
  const limit = claimTranscriptionSlot(clientKey);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "rate-limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid-multipart" }, { status: 400 });
  }
  const audio = form.get("audio");
  const lang = String(form.get("lang") || "en");

  if (!(audio instanceof Blob)) return NextResponse.json({ error: "no-audio" }, { status: 400 });
  if (audio.size > MAX_TRANSCRIPTION_AUDIO_BYTES) return NextResponse.json({ error: "too-large" }, { status: 413 });
  if (audio.size < 1_200) return NextResponse.json({ error: "too-short" }, { status: 400 });
  const mime = audio.type.split(";")[0].toLowerCase();
  if (!["audio/webm", "audio/mp4", "audio/ogg", "audio/wav", "audio/mpeg"].includes(mime)) {
    return NextResponse.json({ error: "unsupported-audio" }, { status: 415 });
  }

  // Only the extension is taken from the upload — never the caller's full
  // filename, which has no business reaching an outbound multipart request.
  const sent = audio instanceof File ? audio.name : "";
  const ext = /\.(webm|m4a|mp4|ogg|wav|mp3|mpga)$/i.exec(sent)?.[1].toLowerCase() ?? "webm";

  const text = await transcribe(audio, getLanguage(lang).code, `speech.${ext}`);
  if (!text) return NextResponse.json({ text: null, source: "unavailable" });
  return NextResponse.json({ text, source: isGemini ? "gemini" : "openai" });
}
