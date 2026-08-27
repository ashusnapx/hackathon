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

/** Speech to text. The citizen speaks Marathi; we need the words. */
export async function transcribe(file: Blob, languageHint?: string): Promise<string | null> {
  if (!KEY) return null;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  try {
    const form = new FormData();
    form.append("file", file, "speech.webm");
    form.append("model", MODEL_TRANSCRIBE);
    if (languageHint) form.append("language", languageHint);

    const res = await fetch(`${BASE}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}` },
      body: form,
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.text ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
