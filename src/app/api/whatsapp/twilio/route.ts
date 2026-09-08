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
  fetchTwilioMedia,
  publicUrl,
  readTwilioForm,
  twiml,
  twilioConfig,
  verifyTwilioSignature,
} from "@/lib/integrations/twilio-whatsapp";
import { advance, afterHandoff, FORGOTTEN, handoffMessages, prompt, STOP } from "@/lib/whatsapp/engine";
import { claimLink, issueClaim } from "@/lib/whatsapp/claim";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * The same interview, over Twilio's WhatsApp sandbox.
 *
 * This is the transport that can be live in five minutes: paste this URL into
 * the sandbox's "when a message comes in" box, set `TWILIO_AUTH_TOKEN`, done.
 * No Meta app, no system-user token, no business verification, no webhook
 * subscription, and no template approval — because the reply is *returned* as
 * TwiML rather than sent, so there is no outbound API call to authenticate.
 *
 * Everything that decides what to say is shared with the Meta route: the same
 * `advance`, the same conversation table, the same one-time handoff token. Only
 * the envelope differs, which is the point — the sandbox is a way to demo this
 * today, not a second implementation to keep in step.
 *
 * ── Why the whole conversation happens inside one request ───────────────────
 *
 * Twilio waits for this response and sends whatever comes back, so the reply
 * has to be computed before returning. That is affordable only because the
 * engine is pure and the read-back uses no model — see the note at the top of
 * `lib/whatsapp/engine.ts`. The one thing that can be slow is transcribing a
 * voice note, which is why `maxDuration` is 30.
 *
 * Nothing here logs a message body, a number or a draft.
 */
export async function POST(req: Request) {
  const config = twilioConfig();
  if (!config) return xml(twiml(["Kavach is not connected to WhatsApp right now."]), 503);

  // The raw form, read once. Both the signature and the message come from it.
  const raw = await req.text();
  const params: Record<string, string> = {};
  for (const [key, value] of new URLSearchParams(raw)) params[key] = value;

  if (!verifyTwilioSignature(publicUrl(req), params, req.headers.get("x-twilio-signature"), config.authToken)) {
    return new Response("bad-signature", { status: 401 });
  }

  const inbound = readTwilioForm(params);
  if (!inbound) return xml(twiml([]));

  if (!databaseConfigured()) {
    return xml(twiml([
      "Kavach cannot take an interview on WhatsApp right now. Please use the website, or call 1930 if money has just left your account.",
    ]));
  }

  try {
    return xml(twiml(await reply(inbound, config, originOf(req))));
  } catch {
    // Never a 500: Twilio would retry, and a retry here asks somebody to
    // describe being robbed twice. An answer they can act on instead.
    return xml(twiml([
      "Something went wrong on my side. Nothing you have told me is lost — send that again and I will pick up where we were.",
    ]));
  }
}

async function reply(
  inbound: ReturnType<typeof readTwilioForm> & object,
  config: NonNullable<ReturnType<typeof twilioConfig>>,
  origin: string,
): Promise<string[]> {
  const conversation = await readConversation(inbound.from);

  // Twilio redelivers on timeout, and a redelivered "yes" must not confirm an
  // extraction twice or open a second case.
  if (alreadySeen(conversation, inbound.messageId)) return [];
  const seen = withSeen(conversation, inbound.messageId);

  const said = await readText(inbound, config);

  if (STOP.test(said)) {
    await deleteConversation(inbound.from);
    return [FORGOTTEN];
  }

  if (conversation?.caseId && !conversation.draft) {
    await writeConversation({
      waId: inbound.from,
      draft: null,
      caseId: conversation.caseId,
      seenMessageIds: seen,
    });
    return afterHandoff(null);
  }

  // A voice note we could not hear: say so, and re-ask what we were asking.
  if (inbound.mediaUrl && !said) {
    await writeConversation({ waId: inbound.from, draft: conversation?.draft ?? null, seenMessageIds: seen });
    return [
      "I could not make out that recording. Could you send it again, or type it instead?",
      ...prompt(conversation?.draft ?? null),
    ];
  }

  const turn = advance(conversation?.draft ?? null, said);

  if (!turn.handoff) {
    await writeConversation({ waId: inbound.from, draft: turn.draft, seenMessageIds: seen });
    return turn.messages;
  }

  const claim = await issueClaim(inbound.from, turn.draft, seen);
  if (!claim) {
    return ["I have everything, but I could not create your case file just now. Please message me again in a minute — nothing you told me is lost."];
  }
  return [...turn.messages, ...handoffMessages(claimLink(origin, claim), turn.draft)];
}

/** A voice note is the point of this channel, not an extra. */
async function readText(
  inbound: NonNullable<ReturnType<typeof readTwilioForm>>,
  config: NonNullable<ReturnType<typeof twilioConfig>>,
): Promise<string> {
  if (!inbound.mediaUrl || !inbound.mediaType?.startsWith("audio")) return inbound.body;

  const media = await fetchTwilioMedia(inbound.mediaUrl, config);
  if (!media) return inbound.body;

  const heard = await transcribe(
    new Blob([media.bytes as unknown as BlobPart], { type: media.mimeType }),
    undefined,
    "voice.ogg",
  );
  return [inbound.body, heard].filter(Boolean).join(" ").trim();
}

function originOf(req: Request): string {
  const url = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;
  const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  return `${proto}://${host}`;
}

function xml(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "content-type": "text/xml; charset=utf-8", "cache-control": "no-store" },
  });
}
