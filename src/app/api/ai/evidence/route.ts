import { jsonCall, MODEL, aiConfigured } from "@/lib/ai/provider";
import {
  cleanReadEvidence,
  READ_EVIDENCE_SCHEMA,
  READ_EVIDENCE_SYSTEM,
  type ReadEvidenceResult,
} from "@/lib/ai/read-evidence";
import {
  claimAiProviderSlot,
  isJsonRecord,
  readAiJsonRequest,
} from "@/lib/ai/request-guard";
import { noStoreJson, requestHasSameOrigin } from "@/lib/http/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** A screenshot of a bank SMS. Anything much larger is not one. */
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

/** What a phone camera or a screenshot actually produces. */
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp"]);

/**
 * Read one piece of evidence the citizen has chosen to send.
 *
 * The bytes are not stored. They arrive in the request, go to the model, and
 * the response carries back only the fields it could read — the image is never
 * written to disk, never put in the database, and never logged. Evidence lives
 * in the citizen's own browser and this route is a lens over it, not a copy.
 *
 * Everything it returns is a draft. See `read-evidence.ts` for why that matters
 * more here than anywhere else in the product: these numbers end up on police
 * complaints, and a model reading a compressed screenshot will sometimes turn a
 * 5 into an S.
 */
export async function POST(req: Request) {
  if (!requestHasSameOrigin(req)) return noStoreJson({ error: "same-origin-required" }, 403);
  if (!aiConfigured) return noStoreJson({ error: "ai-not-configured" }, 503);

  const parsed = await readAiJsonRequest(req, MAX_IMAGE_BYTES + 64 * 1024);
  if (!parsed.ok) return noStoreJson({ error: parsed.error }, parsed.status);
  if (!isJsonRecord(parsed.value)) return noStoreJson({ error: "invalid-json-object" }, 400);

  const body = parsed.value;
  const dataUrl = typeof body.image === "string" ? body.image : "";
  const image = readImageDataUrl(dataUrl);
  if (!image) return noStoreJson({ error: "invalid-image" }, 400);

  // Reading evidence is the most expensive call in the product, and it is one
  // a person can fire repeatedly by tapping a button. Same limiter as the rest.
  const limit = claimAiProviderSlot(req);
  if (!limit.allowed) {
    return noStoreJson(
      { error: "too-many-requests", retryable: true, retryAfterSeconds: limit.retryAfterSeconds },
      429,
    );
  }

  const result = await jsonCall<ReadEvidenceResult>({
    system: READ_EVIDENCE_SYSTEM,
    user: "Read this document and return only what is legibly printed in it.",
    schema: READ_EVIDENCE_SCHEMA as unknown as Record<string, unknown>,
    schemaName: "evidence_read",
    // The full model, not the fast one: this is OCR of a distressed person's
    // screenshot, and the cheap model misreads digits.
    model: MODEL,
    temperature: 0,
    imageDataUrl: dataUrl,
  });

  if (!result) return noStoreJson({ error: "read-failed", retryable: true }, 502);
  return noStoreJson({ read: cleanReadEvidence(result) }, 200);
}

/**
 * A `data:` URL that is actually an image of a permitted type and size.
 *
 * Checked here rather than trusted from the client: this string is forwarded to
 * a third-party provider, and "whatever the browser sent" is not a good enough
 * description of something leaving the building.
 */
function readImageDataUrl(value: string): { mime: string; bytes: number } | null {
  const match = /^data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/i.exec(value);
  if (!match) return null;

  const mime = match[1].toLowerCase();
  if (!ALLOWED.has(mime)) return null;

  // base64 is 4 characters per 3 bytes; close enough to reject the oversized
  // without decoding an attacker-chosen payload first.
  const bytes = Math.floor((match[2].length * 3) / 4);
  if (bytes <= 0 || bytes > MAX_IMAGE_BYTES) return null;

  return { mime, bytes };
}
