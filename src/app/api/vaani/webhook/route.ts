import { noteVaaniWebhookEvent, readSmallJson } from "@/lib/integrations/vaani";
import { json } from "@/lib/integrations/vaani-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Receiver for Vaani call events (register the public URL in the console under
 * Settings -> Webhooks).
 *
 * Vaani does not sign these, so anyone who learns the URL can post to it. The
 * route therefore treats the body as an unauthenticated hint: it records which
 * event arrived and drops every payload field, including the transcript,
 * summary, entities and recording URL that ride along with call_postprocessing.
 * Anything Kavach acts on is re-read from the API with the server's own key.
 */
export async function POST(req: Request) {
  const parsed = await readSmallJson(req, 64_000);
  if (!parsed.ok) return json({ received: false, error: parsed.error }, 400);
  if (!parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return json({ received: false, error: "invalid-json-object" }, 400);
  }

  const body = parsed.value as Record<string, unknown>;
  const event = typeof body.event === "string" ? body.event : "";
  const note = noteVaaniWebhookEvent(event, body.room_name);

  // 200 even for an event we do not model: a retry storm helps nobody, and the
  // provider's delivery is not the place to litigate an unknown event name.
  return json({ received: true, recognised: Boolean(note) }, 200);
}
