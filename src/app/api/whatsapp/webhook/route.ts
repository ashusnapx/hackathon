import { transcribe } from "@/lib/ai/provider";
import {
  alreadySeen,
  deleteConversation,
  readConversation,
  withSeen,
  writeConversation,
} from "@/lib/db/whatsapp";
import { databaseConfigured } from "@/lib/db/supabase";
import {
  downloadMedia,
  markRead,
  readInbound,
  sendText,
  verifySubscription,
  verifyWebhookSignature,
  whatsappConfig,
  type InboundMessage,
  type WhatsAppConfig,
} from "@/lib/integrations/whatsapp";
import { advance, afterHandoff, FORGOTTEN, handoffMessages, prompt, STOP } from "@/lib/whatsapp/engine";
import { issueClaim, claimLink } from "@/lib/whatsapp/claim";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Where a real WhatsApp conversation arrives.
 *
 * Register this URL in the Meta app under WhatsApp → Configuration, with the
 * same string as `WHATSAPP_VERIFY_TOKEN`, and subscribe to the `messages`
 * field. Meta calls GET once to confirm the subscription and POST for every
 * message thereafter.
 *
 * ── Why this returns 200 almost unconditionally ─────────────────────────────
 *
 * Meta retries anything it does not see a 200 for, with increasing delay, for
 * up to a few days. A 500 from a bug on one message therefore becomes the same
 * message delivered again and again — and on this endpoint that means asking a
 * fraud victim the same question repeatedly. So the only non-200 answers are
 * the two that must be: an unsigned request, which is not from Meta at all, and
 * a body we cannot parse. Everything else is absorbed, and the message id is
 * recorded so a retry of something already handled is dropped rather than
 * answered twice.
 *
 * ── What is never logged ────────────────────────────────────────────────────
 *
 * No message body, no phone number, no draft. See the note at the top of
 * `lib/integrations/whatsapp.ts`: the first message many people send here names
 * their bank and their amount.
 */

/** The subscription handshake. */
export async function GET(req: Request) {
  const config = whatsappConfig();
  if (!config) return new Response("not-configured", { status: 503 });

  const challenge = verifySubscription(new URL(req.url).searchParams, config.verifyToken);
  if (!challenge) return new Response("forbidden", { status: 403 });

  // Meta wants the challenge back as plain text, not JSON.
  return new Response(challenge, { status: 200, headers: { "content-type": "text/plain" } });
}

export async function POST(req: Request) {
  const config = whatsappConfig();
  if (!config) return new Response("not-configured", { status: 503 });

  // The raw bytes, before any parsing: the signature is over what was sent, and
  // a JSON round-trip re-encodes it into something with a different digest.
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-hub-signature-256"), config.appSecret)) {
    return new Response("bad-signature", { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("bad-json", { status: 400 });
  }

  const messages = readInbound(payload);
  // Statuses and receipts land here too, and are not an error.
  if (!messages.length) return new Response("ok", { status: 200 });

  if (!databaseConfigured()) {
    // Without storage there is no conversation to continue, and saying nothing
    // is worse than saying so.
    for (const message of messages) {
      await sendText(
        message.from,
        "Kavach is not able to take an interview on WhatsApp right now. Please use the website, or call 1930 if money has just left your account.",
        config,
      );
    }
    return new Response("ok", { status: 200 });
  }

  for (const message of messages) {
    try {
      await handle(message, config, new URL(req.url).origin);
    } catch {
      // One bad message must not fail the batch, and must not earn a retry of
      // the whole batch. Nothing is logged: the failure and the payload are the
      // same object here.
    }
  }

  return new Response("ok", { status: 200 });
}

async function handle(message: InboundMessage, config: WhatsAppConfig, origin: string): Promise<void> {
  const conversation = await readConversation(message.from);

  // Meta redelivers what it thinks failed. A redelivered "yes" must not confirm
  // an extraction twice or open a second case.
  if (alreadySeen(conversation, message.id)) return;
  const seen = withSeen(conversation, message.id);

  await markRead(message.id, config);

  const said = await readText(message, config);

  if (STOP.test(said)) {
    await deleteConversation(message.from);
    await sendText(message.from, FORGOTTEN, config);
    return;
  }

  // Already handed over: point at the case rather than starting a second one.
  if (conversation?.caseId && !conversation.draft) {
    for (const line of afterHandoff(null)) await sendText(message.from, line, config);
    await writeConversation({
      waId: message.from,
      draft: null,
      caseId: conversation.caseId,
      seenMessageIds: seen,
    });
    return;
  }

  if (message.kind === "unsupported") {
    await sendText(
      message.from,
      "I cannot open that kind of message yet. Please type it, or send a voice note.",
      config,
    );
    for (const line of prompt(conversation?.draft ?? null)) await sendText(message.from, line, config);
    await writeConversation({ waId: message.from, draft: conversation?.draft ?? null, seenMessageIds: seen });
    return;
  }

  const turn = advance(conversation?.draft ?? null, said);

  for (const line of turn.messages) await sendText(message.from, line, config);

  if (!turn.handoff) {
    await writeConversation({ waId: message.from, draft: turn.draft, seenMessageIds: seen });
    return;
  }

  // The interview is done. The case itself is built in the browser — `newCase`
  // and the evidence factory are client modules, and the browser is where a
  // case key belongs — so the finished draft waits under a one-time token and
  // the link trades it back exactly once.
  const claim = await issueClaim(message.from, turn.draft, seen);
  if (!claim) {
    await sendText(
      message.from,
      "I have everything, but I could not create your case file just now. Please message me again in a minute — nothing you told me is lost.",
      config,
    );
    return;
  }

  for (const line of handoffMessages(claimLink(origin, claim), turn.draft)) {
    await sendText(message.from, line, config);
  }
}

/**
 * What the person actually said, whatever they sent it as.
 *
 * A voice note is the point of this channel, not a nice extra: the people this
 * is built for often speak a language they do not type, and the alternative to
 * a voice note is a form in English. Transcription failing is therefore
 * answered with a way forward, not an error.
 */
async function readText(message: InboundMessage, config: WhatsAppConfig): Promise<string> {
  if (message.kind !== "audio" || !message.mediaId) return message.text;

  const media = await downloadMedia(message.mediaId, config);
  if (!media) return message.text;

  const heard = await transcribe(
    new Blob([media.bytes as unknown as BlobPart], { type: media.mimeType }),
    undefined,
    "voice.ogg",
  );
  if (!heard) {
    await sendText(
      message.from,
      "I could not make out that recording. Could you send it again, or type it instead?",
      config,
    );
    return "";
  }
  return [message.text, heard].filter(Boolean).join(" ");
}
