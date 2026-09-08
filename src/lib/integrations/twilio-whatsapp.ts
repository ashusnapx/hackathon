import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * WhatsApp through Twilio's sandbox — the version that can be live in minutes.
 *
 * The Meta Cloud API integration next door in `whatsapp.ts` is the real one and
 * is what a production deployment should use. This exists because standing that
 * up needs a Meta app, a system-user token, an app secret and a webhook
 * subscription, and sometimes there is an hour before a demo rather than an
 * afternoon.
 *
 * ── Why this is so much smaller ─────────────────────────────────────────────
 *
 * Twilio will send whatever the webhook *returns*, as TwiML, so there is no
 * outbound API call at all: no access token, no bearer, no send client, no
 * 24-hour window to reason about, nothing to retry. The whole outbound half of
 * the Meta integration collapses into building a short XML document.
 *
 * The cost is honest and worth stating: it is Twilio's shared sandbox number,
 * every participant has to send a join code once, and it is not a number a real
 * victim would ever be given. It is a demo transport, and the page that offers
 * it says so.
 *
 * ── The signature ──────────────────────────────────────────────────────────
 *
 * Twilio signs with HMAC-SHA1 over the full request URL with the POST fields
 * appended in alphabetical order, base64-encoded, in `X-Twilio-Signature`.
 * Nothing here runs unless it matches: the route behind it starts fraud
 * interviews, and an unauthenticated endpoint that does that is the whole
 * problem rather than a corner of it.
 */

export interface TwilioConfig {
  authToken: string;
  /** Only needed to fetch voice notes; text works without it. */
  accountSid: string;
}

export function twilioConfig(): TwilioConfig | null {
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim() ?? "";
  if (!authToken) return null;
  return { authToken, accountSid: process.env.TWILIO_ACCOUNT_SID?.trim() ?? "" };
}

/**
 * The URL Twilio signed, which is not always the URL we received.
 *
 * Behind Vercel's proxy `req.url` is the internal one, and a signature computed
 * over it never matches. The public URL is rebuilt from the forwarded headers,
 * and `TWILIO_WEBHOOK_URL` overrides the lot for the case where a rewrite makes
 * even that wrong — which is otherwise a completely silent failure that looks
 * exactly like a wrong auth token.
 */
export function publicUrl(req: Request): string {
  const override = process.env.TWILIO_WEBHOOK_URL?.trim();
  if (override) return override;

  const url = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;
  const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  return `${proto}://${host}${url.pathname}${url.search}`;
}

export function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  header: string | null,
  authToken: string,
): boolean {
  if (!header) return false;

  // URL first, then every POST field as key immediately followed by value, in
  // alphabetical order by key. No separators anywhere.
  const payload = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);

  const expected = createHmac("sha1", authToken).update(Buffer.from(payload, "utf8")).digest("base64");
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export interface TwilioInbound {
  /** Digits only, so it is the same shape the Meta path stores. */
  from: string;
  body: string;
  /** Twilio's message id. Used for the same idempotency as Meta's. */
  messageId: string;
  mediaUrl?: string;
  mediaType?: string;
}

export function readTwilioForm(params: Record<string, string>): TwilioInbound | null {
  // "whatsapp:+919876543210" → "919876543210"
  const from = (params.From ?? "").replace(/^whatsapp:/, "").replace(/\D/g, "");
  const messageId = params.MessageSid ?? params.SmsMessageSid ?? "";
  if (!from || !messageId) return null;

  const count = Number(params.NumMedia ?? "0");
  return {
    from,
    body: params.Body ?? "",
    messageId,
    mediaUrl: count > 0 ? params.MediaUrl0 : undefined,
    mediaType: count > 0 ? params.MediaContentType0 : undefined,
  };
}

const ESCAPE: Record<string, string> = {
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
};

/**
 * The reply, as TwiML.
 *
 * Escaping is not cosmetic here: the messages carry a person's own words back
 * to them, and an ampersand in a URL they pasted would otherwise produce XML
 * Twilio rejects — turning one stray character into a conversation that
 * silently stops answering.
 */
export function twiml(messages: string[]): string {
  const body = messages
    .filter((m) => m.trim())
    .map((m) => `<Message>${m.replace(/[&<>"']/g, (c) => ESCAPE[c])}</Message>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`;
}

/** Twilio keeps media behind basic auth with the account credentials. */
export async function fetchTwilioMedia(
  url: string,
  config: TwilioConfig,
): Promise<{ bytes: Uint8Array; mimeType: string } | null> {
  if (!config.accountSid) return null;
  try {
    const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64");
    const res = await fetch(url, {
      headers: { authorization: `Basic ${auth}` },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > 16 * 1024 * 1024) return null;
    return {
      bytes: new Uint8Array(buffer),
      mimeType: res.headers.get("content-type") ?? "audio/ogg",
    };
  } catch {
    return null;
  }
}
