import type { IntakeDraft } from "@/lib/intake/interview";
import { database } from "./supabase";

/**
 * The half-finished WhatsApp interview, between webhooks.
 *
 * Everything here is service-role and server-only; see the migration for why
 * this is the most sensitive table in the schema and what is done about it.
 *
 * Nothing in this file logs a draft, a narrative or a number. A failure returns
 * null or false and the caller decides what to say to the person — which is
 * never "an internal error occurred", because they are not debugging anything,
 * they have been robbed.
 */

/** Meta retries; keep enough ids to recognise one, and no more. */
const SEEN_LIMIT = 40;

/** An abandoned interview is deleted, not archived. */
const TTL_DAYS = 7;

export interface Conversation {
  waId: string;
  draft: IntakeDraft | null;
  caseId: string | null;
  seenMessageIds: string[];
}

interface Row {
  wa_id: string;
  draft: unknown;
  case_id: string | null;
  seen_message_ids: string[] | null;
}

function toConversation(row: Row): Conversation {
  const draft = row.draft && typeof row.draft === "object" && !Array.isArray(row.draft)
    ? (row.draft as IntakeDraft)
    : null;
  return {
    waId: row.wa_id,
    // An emptied draft is `{}`, which is an object but not an IntakeDraft. The
    // version field is what separates "handed off" from "mid-interview".
    draft: draft && (draft as { version?: unknown }).version === 1 ? draft : null,
    caseId: row.case_id,
    seenMessageIds: Array.isArray(row.seen_message_ids) ? row.seen_message_ids : [],
  };
}

export async function readConversation(waId: string): Promise<Conversation | null> {
  const { data, error } = await database()
    .from("whatsapp_conversations")
    .select("wa_id, draft, case_id, seen_message_ids")
    .eq("wa_id", waId)
    .maybeSingle();
  if (error || !data) return null;
  return toConversation(data as Row);
}

/**
 * Write the conversation forward.
 *
 * `expires_at` is pushed out on every write, so a live conversation is never
 * collected under somebody who is still typing, and an abandoned one ages out
 * from its last message rather than from when it began.
 */
export async function writeConversation(input: {
  waId: string;
  draft: IntakeDraft | null;
  caseId?: string | null;
  seenMessageIds: string[];
}): Promise<boolean> {
  const expires = new Date(Date.now() + TTL_DAYS * 86_400_000).toISOString();
  const { error } = await database()
    .from("whatsapp_conversations")
    .upsert(
      {
        wa_id: input.waId,
        draft: input.draft ?? {},
        case_id: input.caseId ?? null,
        seen_message_ids: input.seenMessageIds.slice(0, SEEN_LIMIT),
        updated_at: new Date().toISOString(),
        expires_at: expires,
      },
      { onConflict: "wa_id" },
    );
  return !error;
}

/**
 * Has this message already been acted on?
 *
 * Meta redelivers anything it did not see a 200 for within its timeout, and a
 * redelivered "yes, that's right" must not confirm an extraction twice or open
 * a second case. The id is Meta's own and is stable across retries.
 */
export function alreadySeen(conversation: Conversation | null, messageId: string): boolean {
  return Boolean(conversation?.seenMessageIds.includes(messageId));
}

export function withSeen(conversation: Conversation | null, messageId: string): string[] {
  return [messageId, ...(conversation?.seenMessageIds ?? [])].slice(0, SEEN_LIMIT);
}

/** Called by the scheduled job. Returns how many rows went. */
export async function purgeExpiredConversations(): Promise<number> {
  const { data, error } = await database()
    .from("whatsapp_conversations")
    .delete()
    .lt("expires_at", new Date().toISOString())
    .select("wa_id");
  if (error || !data) return 0;
  return data.length;
}

/** Somebody asking to be forgotten, mid-interview. */
export async function deleteConversation(waId: string): Promise<boolean> {
  const { error } = await database().from("whatsapp_conversations").delete().eq("wa_id", waId);
  return !error;
}
