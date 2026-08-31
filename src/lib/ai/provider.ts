/**
 * A deliberately thin OpenAI client.
 *
 * Written against the OpenAI HTTP API rather than the SDK so that the same code
 * path works against any OpenAI-compatible endpoint — useful because the voice
 * side of this product is meant to run on an Indian-language speech provider
 * while the reasoning stays on OpenAI. `OPENAI_BASE_URL` is the only knob.
 *
 * Every caller must handle `null`. If there is no key, or the call fails, or it
 * takes too long, we fall back to the rules engine in `fallback.ts`. A victim of
 * fraud at 2am is not a good moment to show an error screen.
 */

const BASE = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const KEY = process.env.OPENAI_API_KEY;

export const MODEL = process.env.OPENAI_MODEL || "gpt-5";
export const MODEL_FAST = process.env.OPENAI_MODEL_FAST || "gpt-5-mini";
export const MODEL_TRANSCRIBE = process.env.OPENAI_MODEL_TRANSCRIBE || "gpt-4o-transcribe";

/**
 * Google's OpenAI-compatibility layer implements chat, embeddings and images —
 * but not `/audio/transcriptions`, which 404s. That endpoint is the only way
 * voice reaches the server, so with a Gemini base URL every recording failed
 * silently and voice input worked on desktop (Chrome's own SpeechRecognition)
 * and nowhere else. Gemini transcribes audio perfectly well; it just has to be
 * asked through its native `generateContent` instead.
 */
const GEMINI_HOST = "generativelanguage.googleapis.com";
export const isGemini = BASE.includes(GEMINI_HOST);

/** `…/v1beta/openai` → `…/v1beta`, the native API next to the shim. */
const geminiNativeBase = BASE.replace(/\/openai\/?$/, "");

/** The multimodal chat model does transcription; there is no separate one. */
const GEMINI_TRANSCRIBE_MODEL = process.env.GEMINI_TRANSCRIBE_MODEL || MODEL;

export const aiConfigured = Boolean(KEY);

/** Long enough for a real answer, short enough that a stuck call still degrades. */
const TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS || 45_000);

interface JsonCallOpts {
  system: string;
  user: string;
  schema: Record<string, unknown>;
  schemaName: string;
  model?: string;
  /** Higher for drafting prose, lower for classification. */
  temperature?: number;
}

async function post(path: string, body: unknown, signal: AbortSignal) {
  return fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify(body),
    signal,
  });
}

/**
 * Structured output. `strict` json_schema means we get back something that
 * matches our TypeScript types or nothing at all — no defensive parsing of
 * half-formed JSON in the request path.
 */
export async function jsonCall<T>(opts: JsonCallOpts): Promise<T | null> {
  if (!KEY) return null;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  try {
    const res = await post(
      "/chat/completions",
      {
        model: opts.model || MODEL,
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.user },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: opts.schemaName, strict: true, schema: opts.schema },
        },
        ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
      },
      ctrl.signal,
    );

    if (!res.ok) {
      console.error("[ai] %s %s", res.status, (await res.text()).slice(0, 400));
      return null;
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    return content ? (JSON.parse(content) as T) : null;
  } catch (err) {
    console.error("[ai] call failed:", err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Plain prose, for the assistant. */
export async function textCall(system: string, user: string, model = MODEL_FAST): Promise<string | null> {
  if (!KEY) return null;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  try {
    const res = await post(
      "/chat/completions",
      {
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      },
      ctrl.signal,
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Gemini has a hard cap on inline request bytes; base64 inflates by a third. */
const INLINE_AUDIO_LIMIT = 12 * 1024 * 1024;

/**
 * Asking the model to stay silent does not work, and it is not a cosmetic
 * failure here: this text is drafted into a police complaint and a letter to a
 * bank. Told to "output nothing" for five seconds of digital silence, it
 * returned "Minnie and Mickey", "Don't go near the water." and "I want a double
 * cheeseburger with extra cheese, please."
 *
 * A model will not reliably withhold text, but it will reliably fill in a
 * field. So it answers a boolean about whether there was speech at all, and we
 * throw the transcript away when that is false. The client-side silence gate in
 * VoiceInput is the first line of defence; this is the second.
 */
const TRANSCRIBE_PROMPT =
  "You are a transcription engine for a cybercrime complaint tool.\n\n" +
  "Set speech_present to true only if you can clearly hear intelligible human speech. " +
  "If the audio is silent, inaudible, or is only noise, set speech_present to false and leave " +
  "transcript empty. Never guess and never invent words that are not clearly audible — an " +
  "invented sentence here ends up in a legal complaint against a real person.\n\n" +
  "When there is speech, put a verbatim transcript in transcript, in the language actually " +
  "spoken, using that language's own script. No translation, no commentary, no quotation marks.";

const TRANSCRIBE_SCHEMA = {
  type: "OBJECT",
  properties: {
    speech_present: { type: "BOOLEAN" },
    transcript: { type: "STRING" },
  },
  required: ["speech_present", "transcript"],
} as const;

function mimeFor(file: Blob, filename: string): string {
  if (file.type) return file.type.split(";")[0];
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "m4a" || ext === "mp4") return "audio/mp4";
  if (ext === "ogg") return "audio/ogg";
  if (ext === "wav") return "audio/wav";
  if (ext === "mp3" || ext === "mpga") return "audio/mpeg";
  return "audio/webm";
}

/** Gemini's native path: the audio rides inline, base64, next to the prompt. */
async function transcribeGemini(
  file: Blob,
  languageHint: string | undefined,
  filename: string,
  signal: AbortSignal,
): Promise<string | null> {
  if (file.size > INLINE_AUDIO_LIMIT) return null;

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const prompt = languageHint
    ? `${TRANSCRIBE_PROMPT} The speaker is most likely using the language with code "${languageHint}", but transcribe whatever is actually spoken.`
    : TRANSCRIBE_PROMPT;

  const res = await fetch(
    `${geminiNativeBase}/models/${GEMINI_TRANSCRIBE_MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": KEY as string },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeFor(file, filename), data: base64 } },
            ],
          },
        ],
        // Transcription, not composition. Keep it from embellishing.
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: TRANSCRIBE_SCHEMA,
        },
      }),
      signal,
    },
  );

  if (!res.ok) {
    console.error("[ai] transcribe %s %s", res.status, (await res.text()).slice(0, 300));
    return null;
  }

  // Errors come back wrapped in an array from this API; success does not.
  const raw = await res.json();
  const data = Array.isArray(raw) ? raw[0] : raw;
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;

  const body = parts
    .map((p: { text?: string }) => p?.text ?? "")
    .join("")
    .trim();
  if (!body) return null;

  try {
    const parsed = JSON.parse(body) as { speech_present?: boolean; transcript?: string };
    if (!parsed.speech_present) return null;
    const transcript = (parsed.transcript ?? "").trim();
    return transcript || null;
  } catch {
    // Schema-constrained output should always parse; if it somehow does not,
    // a complaint is the wrong place to guess.
    console.error("[ai] transcribe returned unparseable JSON");
    return null;
  }
}

/** The real OpenAI path, for an OPENAI_BASE_URL that actually implements it. */
async function transcribeOpenAI(
  file: Blob,
  languageHint: string | undefined,
  filename: string,
  signal: AbortSignal,
): Promise<string | null> {
  const form = new FormData();
  form.append("file", file, filename);
  form.append("model", MODEL_TRANSCRIBE);
  if (languageHint) form.append("language", languageHint);

  const res = await fetch(`${BASE}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}` },
    body: form,
    signal,
  });
  if (!res.ok) {
    console.error("[ai] transcribe %s %s", res.status, (await res.text()).slice(0, 300));
    return null;
  }
  const data = await res.json();
  return data?.text ?? null;
}

/**
 * Speech to text. The citizen speaks Marathi; we need the words.
 *
 * `filename` is not cosmetic on the OpenAI path: that endpoint picks its
 * demuxer from the extension, so an iPhone's MP4 recording announced as
 * `speech.webm` is rejected outright. The browser sends the real one.
 */
export async function transcribe(
  file: Blob,
  languageHint?: string,
  filename = "speech.webm",
): Promise<string | null> {
  if (!KEY) return null;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  try {
    return isGemini
      ? await transcribeGemini(file, languageHint, filename, ctrl.signal)
      : await transcribeOpenAI(file, languageHint, filename, ctrl.signal);
  } catch (err) {
    console.error("[ai] transcribe failed:", err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
