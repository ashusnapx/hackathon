import { database } from "./supabase";

/**
 * Reading and writing one case, by key.
 *
 * Every function here takes a hash, never a key: the key stays in the route
 * that received it, and this layer cannot be talked into logging one. Access is
 * expressed as part of the query rather than checked beforehand, so a wrong key
 * matches no row instead of matching a row we then have to remember to reject.
 */

export interface StoredCase {
  data: unknown;
  revision: number;
  updatedAt: string;
}

export type WriteResult =
  | { ok: true; revision: number }
  | { ok: false; reason: "key-mismatch" | "unavailable" };

/** Postgres raises this through the function when the key does not match. */
const KEY_MISMATCH = "case-key-mismatch";

export async function readCaseRow(id: string, keyHash: string): Promise<StoredCase | null> {
  const { data, error } = await database()
    .from("cases")
    .select("data, revision, updated_at")
    .eq("id", id)
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (error) throw new Error(`case-read-failed: ${error.message}`);
  if (!data) return null;
  return {
    data: data.data,
    revision: Number(data.revision),
    updatedAt: String(data.updated_at),
  };
}

export async function writeCaseRow(input: {
  id: string;
  keyHash: string;
  ref: string;
  data: unknown;
}): Promise<WriteResult> {
  const { data, error } = await database().rpc("put_case", {
    p_id: input.id,
    p_key_hash: input.keyHash,
    p_ref: input.ref,
    p_data: input.data,
  });

  if (error) {
    if (error.message.includes(KEY_MISMATCH)) return { ok: false, reason: "key-mismatch" };
    return { ok: false, reason: "unavailable" };
  }
  return { ok: true, revision: Number(data) };
}

/**
 * Delete means delete.
 *
 * A person who asks Kavach to forget a case is usually asking for a reason —
 * someone else uses the device, or they no longer want a record of what
 * happened to them. A soft-deleted row would not honour that.
 */
export async function deleteCaseRow(id: string, keyHash: string): Promise<boolean> {
  const { data, error } = await database()
    .from("cases")
    .delete()
    .eq("id", id)
    .eq("key_hash", keyHash)
    .select("id");

  if (error) throw new Error(`case-delete-failed: ${error.message}`);
  return (data?.length ?? 0) > 0;
}
