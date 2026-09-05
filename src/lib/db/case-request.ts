import { CASE_KEY_PATTERN } from "@/lib/case/key";

/**
 * What a case route will accept before it touches the database.
 *
 * Shape is checked here rather than in three route files, because the day one
 * of them forgets is the day an unbounded id reaches a query.
 */

export const CASE_ID_PATTERN = /^[A-Za-z0-9_-]{6,64}$/;

/** A case document is small; anything near this is not one. */
export const MAX_CASE_BYTES = 512 * 1024;

export interface CaseCredentials {
  id: string;
  key: string;
}

export function readCaseCredentials(body: Record<string, unknown>): CaseCredentials | null {
  const { id, key } = body;
  if (typeof id !== "string" || !CASE_ID_PATTERN.test(id)) return null;
  if (typeof key !== "string" || !CASE_KEY_PATTERN.test(key)) return null;
  return { id, key };
}

/**
 * The document itself has to be a case, and it has to be *this* case: a body
 * that claims one id in its credentials and carries another would let a caller
 * write a case they hold the key to, using content addressed to a different id.
 */
export function readCaseDocument(
  body: Record<string, unknown>,
  id: string,
): { data: Record<string, unknown>; ref: string } | null {
  const data = body.case;
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const record = data as Record<string, unknown>;
  if (record.id !== id) return null;
  const ref = record.ref;
  if (typeof ref !== "string" || ref.length < 3 || ref.length > 40) return null;
  return { data: record, ref };
}
