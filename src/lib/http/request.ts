import { NextResponse } from "next/server";

/**
 * Request handling shared by every route that accepts a body.
 *
 * These began inside the Vaani module, where they were written, and are shared
 * from here now that case storage needs the same two guarantees: a request
 * really came from this site, and a body cannot be made arbitrarily large by
 * whoever is sending it.
 */

export function requestHasSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin || origin === "null") return false;
  try {
    return new URL(origin).origin === new URL(req.url).origin;
  } catch {
    return false;
  }
}

export type SmallJsonResult =
  | { ok: true; value: unknown }
  | { ok: false; error: "unsupported-media-type" | "body-too-large" | "invalid-json" };

/** Read a bounded JSON body without first buffering an attacker-controlled size. */
export async function readSmallJson(req: Request, maxBytes = 4_096): Promise<SmallJsonResult> {
  const contentType = req.headers.get("content-type")?.toLowerCase() || "";
  if (contentType.split(";", 1)[0].trim() !== "application/json") {
    return { ok: false, error: "unsupported-media-type" };
  }
  const declaredLength = Number(req.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return { ok: false, error: "body-too-large" };
  }
  if (!req.body) return { ok: false, error: "invalid-json" };

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      return { ok: false, error: "body-too-large" };
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { ok: true, value: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) };
  } catch {
    return { ok: false, error: "invalid-json" };
  }
}

/** A case is a person's own record; no cache may hold a copy of it. */
export function noStoreJson(payload: object, status: number, headers?: Record<string, string>) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache", ...headers },
  });
}

export type BodyError = Extract<SmallJsonResult, { ok: false }>["error"];

export function statusForBodyError(error: BodyError): number {
  return error === "unsupported-media-type" ? 415 : error === "body-too-large" ? 413 : 400;
}
