import { caseKeyHash } from "@/lib/case/key";
import { database } from "@/lib/db/supabase";
import type { IntakeDraft } from "@/lib/intake/interview";

/**
 * The handoff from the chat to the browser.
 *
 * The interview finishes on WhatsApp but the case is built in the browser, for
 * a reason that is structural rather than convenient: a case is held by its
 * key, the key is made in the browser and never sent to us, and `newCase` and
 * the evidence factory are client modules. If the webhook minted a case it
 * would have to mint a key too, which would mean the server had briefly held
 * the one secret this design exists to never hold.
 *
 * So the finished draft waits under a one-time token instead. The token goes
 * out in the link, the browser trades it for the draft exactly once, and the
 * draft is destroyed in the same statement that returns it. Only the SHA-256 is
 * stored, the same posture as `cases.key_hash` — a copy of the table cannot be
 * used to claim anybody's interview.
 */

/** Long enough to be unguessable, short enough to survive a WhatsApp line. */
const TOKEN_BYTES = 24;

/** A link somebody has to notice, open and act on. Hours, not minutes. */
const TTL_MS = 48 * 60 * 60 * 1000;

export const CLAIM_PATTERN = /^[A-Za-z0-9_-]{32}$/;

function newToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES);
  globalThis.crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Reuses the case-key digest: same algorithm, same reasoning, one implementation. */
const tokenHash = caseKeyHash;

/**
 * Park the finished draft and return the token for its link.
 *
 * The draft stays in the row until it is claimed — this is the one window in
 * which the sensitive half of a conversation outlives the conversation, and it
 * is bounded by `claim_expires_at` and by the row's own `expires_at`.
 */
export async function issueClaim(
  waId: string,
  draft: IntakeDraft,
  seenMessageIds: string[],
): Promise<string | null> {
  const token = newToken();
  const { error } = await database()
    .from("whatsapp_conversations")
    .upsert(
      {
        wa_id: waId,
        draft,
        seen_message_ids: seenMessageIds.slice(0, 40),
        claim_hash: await tokenHash(token),
        claim_expires_at: new Date(Date.now() + TTL_MS).toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "wa_id" },
    );
  return error ? null : token;
}

/** Where the link points. `/assist` is the interview the browser already runs. */
export function claimLink(origin: string, token: string): string {
  return `${origin}/assist?wa=${token}`;
}

/**
 * Trade a token for the draft, once.
 *
 * The clear is not conditional on the caller doing anything afterwards: a token
 * that has been handed out is spent, whether or not the browser it went to
 * finished building the case. A second use returns null, which the page reads
 * as "this link has already been opened" rather than as an error.
 */
export async function redeemClaim(token: string): Promise<IntakeDraft | null> {
  if (!CLAIM_PATTERN.test(token)) return null;

  const hash = await tokenHash(token);
  const { data, error } = await database()
    .from("whatsapp_conversations")
    .select("wa_id, draft, claim_expires_at")
    .eq("claim_hash", hash)
    .maybeSingle();

  if (error || !data) return null;
  if (!data.claim_expires_at || new Date(data.claim_expires_at).getTime() < Date.now()) return null;

  const draft = data.draft as IntakeDraft | null;
  if (!draft || (draft as { version?: unknown }).version !== 1) return null;

  // Spent, and the sensitive half of the row goes with it. What remains is a
  // pointer: this number finished an interview, and nothing about what was in
  // it. The case now exists only where it should — behind its own key.
  await database()
    .from("whatsapp_conversations")
    .update({
      draft: {},
      claim_hash: null,
      claim_expires_at: null,
      case_id: "claimed",
      updated_at: new Date().toISOString(),
    })
    .eq("wa_id", data.wa_id);

  return draft;
}
