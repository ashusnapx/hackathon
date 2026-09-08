/**
 * The WhatsApp Cloud API, for real this time.
 *
 * `whatsapp-simulator.ts` next door models the delivery rules — the 24-hour
 * customer-service window, template categories, delivery receipts — so the
 * replica on /whatsapp can behave correctly without a connection. This file is
 * the connection: it talks to Meta's Graph API, and everything it exports is
 * server-only.
 *
 * ── What is deliberately not in here ────────────────────────────────────────
 *
 * No message content is ever logged, at any level. The people on the other end
 * of this integration have just been defrauded, and the first message many of
 * them send names their bank, their amount and sometimes their account number.
 * A debug line carrying that into a hosting provider's log drain is a data
 * breach that no amount of "it was only in development" undoes. What can be
 * logged is shape: which event arrived, whether a send succeeded, an error
 * code. Never the body.
 *
 * ── The signature is not optional ───────────────────────────────────────────
 *
 * Every POST from Meta carries `X-Hub-Signature-256: sha256=<hex>`, an
 * HMAC-SHA256 of the *raw* body keyed with the app secret. Without checking it,
 * the webhook URL is an open endpoint that anyone who learns it can drive — and
 * this one starts fraud interviews and writes case files. The comparison is
 * timing-safe and runs on the exact bytes received, before any parsing: a JSON
 * round-trip re-orders nothing but re-encodes everything, and the digest of
 * re-encoded bytes is a different digest.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

/** Overridable, because Meta retires versions on a rolling two-year clock. */
const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION?.trim() || "v23.0";
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;

const TIMEOUT_MS = Number(process.env.WHATSAPP_TIMEOUT_MS || 12_000);

/** WhatsApp's own ceiling on a text body. */
export const WHATSAPP_TEXT_LIMIT = 4096;

export interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  appSecret: string;
  verifyToken: string;
}

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

/**
 * Every piece, or none. A half-configured integration is worse than an absent
 * one: it accepts webhooks it cannot answer, so a victim messages a number that
 * reads their message and says nothing back.
 */
export function whatsappConfig(): WhatsAppConfig | null {
  const phoneNumberId = env("WHATSAPP_PHONE_NUMBER_ID");
  const accessToken = env("WHATSAPP_ACCESS_TOKEN");
  const appSecret = env("WHATSAPP_APP_SECRET");
  const verifyToken = env("WHATSAPP_VERIFY_TOKEN");
  if (!phoneNumberId || !accessToken || !appSecret || !verifyToken) return null;
  return { phoneNumberId, accessToken, appSecret, verifyToken };
}

export function whatsappConfigured(): boolean {
  return whatsappConfig() !== null;
}

/**
 * Does this body carry Meta's signature for our app secret?
 *
 * `rawBody` must be the bytes as received. Both the digest and the header are
 * compared as fixed-length buffers through `timingSafeEqual`, which refuses
 * unequal lengths — so the length check is done first and returns the same
 * `false` rather than throwing.
 */
export function verifyWebhookSignature(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!header) return false;
  const [scheme, provided] = header.split("=");
  if (scheme !== "sha256" || !provided) return false;

  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  if (provided.length !== expected.length) return false;

  try {
    return timingSafeEqual(Buffer.from(provided, "hex"), Buffer.from(expected, "hex"));
  } catch {
    // Non-hex in the header. Malformed, therefore unsigned.
    return false;
  }
}

/**
 * The subscription handshake Meta performs when the webhook URL is saved.
 * Returns the challenge to echo back, or null to refuse with a 403.
 */
export function verifySubscription(params: URLSearchParams, verifyToken: string): string | null {
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");
  if (mode !== "subscribe" || !challenge) return null;
  if (!token || token.length !== verifyToken.length) return null;
  try {
    if (!timingSafeEqual(Buffer.from(token), Buffer.from(verifyToken))) return null;
  } catch {
    return null;
  }
  return challenge;
}

/* ── Inbound ─────────────────────────────────────────────────────────────── */

export type InboundKind = "text" | "audio" | "image" | "document" | "unsupported";

export interface InboundMessage {
  /** Meta's id for the message. The idempotency key — Meta retries. */
  id: string;
  /** The sender, in international format without a plus. */
  from: string;
  kind: InboundKind;
  /** Present for text, and for the caption of a media message. */
  text: string;
  /** Present for audio, image and document. */
  mediaId?: string;
  mimeType?: string;
  /** Seconds since the epoch, as Meta sends it. */
  timestamp: number;
}

/**
 * Pull the messages out of a webhook payload.
 *
 * Meta batches: one POST can carry several entries, each with several changes,
 * each with several messages. Anything that is not a message — a delivery
 * receipt, a read receipt, a status change — is dropped here rather than
 * modelled, because this integration only ever acts on what somebody said.
 */
export function readInbound(payload: unknown): InboundMessage[] {
  const out: InboundMessage[] = [];
  const root = payload as { entry?: unknown[] } | null;
  if (!root || !Array.isArray(root.entry)) return out;

  for (const entry of root.entry) {
    const changes = (entry as { changes?: unknown[] })?.changes;
    if (!Array.isArray(changes)) continue;

    for (const change of changes) {
      const value = (change as { value?: Record<string, unknown> })?.value;
      const messages = value?.messages;
      if (!Array.isArray(messages)) continue;

      for (const raw of messages) {
        const m = raw as Record<string, unknown>;
        const id = typeof m.id === "string" ? m.id : "";
        const from = typeof m.from === "string" ? m.from.replace(/\D/g, "") : "";
        if (!id || !from) continue;

        const type = typeof m.type === "string" ? m.type : "";
        const timestamp = Number(m.timestamp) || Math.floor(Date.now() / 1000);
        const media = m[type] as Record<string, unknown> | undefined;

        if (type === "text") {
          const body = (m.text as { body?: unknown })?.body;
          out.push({ id, from, kind: "text", text: typeof body === "string" ? body : "", timestamp });
          continue;
        }

        if (type === "audio" || type === "image" || type === "document") {
          out.push({
            id,
            from,
            kind: type,
            text: typeof media?.caption === "string" ? media.caption : "",
            mediaId: typeof media?.id === "string" ? media.id : undefined,
            mimeType: typeof media?.mime_type === "string" ? media.mime_type : undefined,
            timestamp,
          });
          continue;
        }

        // Interactive replies — a button or list tap — carry the id we set on
        // the option, which is what the engine matches on.
        if (type === "interactive") {
          const interactive = m.interactive as Record<string, unknown> | undefined;
          const reply =
            (interactive?.button_reply as { id?: unknown; title?: unknown } | undefined)
            ?? (interactive?.list_reply as { id?: unknown; title?: unknown } | undefined);
          if (reply && typeof reply.id === "string") {
            out.push({ id, from, kind: "text", text: reply.id, timestamp });
            continue;
          }
        }

        out.push({ id, from, kind: "unsupported", text: "", timestamp });
      }
    }
  }
  return out;
}

/* ── Outbound ────────────────────────────────────────────────────────────── */

async function graph(path: string, init: RequestInit, token: string): Promise<Response> {
  return fetch(`${GRAPH}/${path}`, {
    ...init,
    headers: { ...init.headers, authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

export interface SendResult {
  ok: boolean;
  /** Meta's error code, for the log line that may not carry the message. */
  code?: number;
}

/**
 * Send one text message.
 *
 * Free-form text only reaches somebody inside the 24-hour window their own
 * message opened. Every send this integration makes is a reply to something
 * just received, so the window is open by construction — and if it is not, Meta
 * refuses with error 131047 and the caller learns it from `code` rather than
 * from silence.
 */
export async function sendText(to: string, body: string, config: WhatsAppConfig): Promise<SendResult> {
  const text = body.slice(0, WHATSAPP_TEXT_LIMIT);
  try {
    const res = await graph(
      `${config.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "text",
          // Off, so a bank's domain in a draft does not render a preview card
          // pulled from a site we have not checked.
          text: { preview_url: false, body: text },
        }),
      },
      config.accessToken,
    );
    if (res.ok) return { ok: true };
    const failure = (await res.json().catch(() => null)) as { error?: { code?: number } } | null;
    return { ok: false, code: failure?.error?.code };
  } catch {
    return { ok: false };
  }
}

/** Two blue ticks, so somebody who has just been robbed knows it arrived. */
export async function markRead(messageId: string, config: WhatsAppConfig): Promise<void> {
  try {
    await graph(
      `${config.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", status: "read", message_id: messageId }),
      },
      config.accessToken,
    );
  } catch {
    // A receipt is a courtesy. Failing to send one must never fail the reply.
  }
}

/** Bytes are capped: a voice note we transcribe, not a video we store. */
const MEDIA_LIMIT_BYTES = 16 * 1024 * 1024;

export interface Media {
  bytes: Uint8Array;
  mimeType: string;
}

/**
 * Fetch a media attachment. Two hops, both authenticated: the id resolves to a
 * short-lived URL on Meta's CDN, and that URL still requires the bearer token.
 */
export async function downloadMedia(mediaId: string, config: WhatsAppConfig): Promise<Media | null> {
  try {
    const lookup = await graph(mediaId, { method: "GET" }, config.accessToken);
    if (!lookup.ok) return null;
    const meta = (await lookup.json()) as { url?: unknown; mime_type?: unknown; file_size?: unknown };
    if (typeof meta.url !== "string") return null;
    if (Number(meta.file_size) > MEDIA_LIMIT_BYTES) return null;

    const file = await fetch(meta.url, {
      headers: { authorization: `Bearer ${config.accessToken}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!file.ok) return null;

    const buffer = await file.arrayBuffer();
    if (buffer.byteLength > MEDIA_LIMIT_BYTES) return null;
    return {
      bytes: new Uint8Array(buffer),
      mimeType: typeof meta.mime_type === "string" ? meta.mime_type : "application/octet-stream",
    };
  } catch {
    return null;
  }
}
