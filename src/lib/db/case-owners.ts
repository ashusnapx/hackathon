import { database } from "./supabase";

/**
 * The keyring that makes a case reachable from a second device.
 *
 * Every function here takes a user id that a route has already verified against
 * Supabase with `auth.getUser()` — never one read off a request body, and never
 * one taken from a cookie without checking it. The user id is part of every
 * query rather than something checked beforehand, so a mistake matches no row
 * instead of matching a row we then have to remember to reject.
 *
 * See `supabase/migrations/0003_case_owners.sql` for why this stores case keys
 * rather than hashes, and what that costs.
 */

export interface OwnedCase {
  id: string;
  key: string;
}

/** Every case attached to this account, newest first. */
export async function listOwnedCases(userId: string): Promise<OwnedCase[]> {
  const { data, error } = await database()
    .from("case_owners")
    .select("case_id, case_key")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`case-owner-list-failed: ${error.message}`);
  return (data ?? []).map((row) => ({ id: String(row.case_id), key: String(row.case_key) }));
}

/**
 * Attach cases to an account.
 *
 * Idempotent by primary key: a device that re-offers a case it has already
 * attached changes nothing, which is what makes it safe to call this on every
 * sign-in without first working out what the account already knows.
 *
 * The foreign key onto `public.cases` is doing real work here. A case is only
 * attachable once it has actually been stored, so a browser cannot register a
 * keyring entry for a case id that does not exist — and `on delete cascade`
 * means deleting the case takes its keyring entries with it, so "delete this
 * case" keeps meaning what it says.
 */
export async function claimCases(userId: string, cases: OwnedCase[]): Promise<number> {
  if (!cases.length) return 0;

  const { data, error } = await database()
    .from("case_owners")
    .upsert(
      cases.map((c) => ({ user_id: userId, case_id: c.id, case_key: c.key })),
      { onConflict: "user_id,case_id", ignoreDuplicates: true },
    )
    .select("case_id");

  // A case that is not in `public.cases` yet violates the foreign key. That is
  // an ordinary race — the device is still pushing it — and not worth failing
  // the whole request over, so it is reported as nothing claimed.
  if (error) {
    if (error.code === "23503") return 0;
    throw new Error(`case-owner-claim-failed: ${error.message}`);
  }
  return data?.length ?? 0;
}

/** Detach one case from this account, without touching the case itself. */
export async function releaseCase(userId: string, caseId: string): Promise<void> {
  const { error } = await database()
    .from("case_owners")
    .delete()
    .eq("user_id", userId)
    .eq("case_id", caseId);

  if (error) throw new Error(`case-owner-release-failed: ${error.message}`);
}

export interface OwnedCaseWithOwner {
  caseId: string;
  caseKey: string;
  email: string;
}

/**
 * Every attached case and the address of the account it belongs to.
 *
 * Only the reminder job calls this, and it is the one function here that is not
 * scoped to a single verified user — so it is deliberately unexported from any
 * route: it reads the whole table, and any route that returned its result would
 * be handing out every case key in the system.
 *
 * The email comes from Supabase's auth records rather than from anything the
 * person typed into a case, which is what makes the reminder go to an address
 * they have actually proved they control.
 */
export async function everyOwnedCase(): Promise<OwnedCaseWithOwner[]> {
  const db = database();
  const { data, error } = await db
    .from("case_owners")
    .select("user_id, case_id, case_key");
  if (error) throw new Error(`case-owner-scan-failed: ${error.message}`);

  const rows = data ?? [];
  // One lookup per distinct account rather than per case: somebody with six
  // cases is one person with one address.
  const emails = new Map<string, string>();
  for (const userId of new Set(rows.map((row) => String(row.user_id)))) {
    const { data: user } = await db.auth.admin.getUserById(userId);
    const email = user?.user?.email;
    if (email) emails.set(userId, email);
  }

  return rows.flatMap((row) => {
    const email = emails.get(String(row.user_id));
    // An account with no address cannot be reminded. Not an error: it simply
    // has nowhere to send to.
    return email
      ? [{ caseId: String(row.case_id), caseKey: String(row.case_key), email }]
      : [];
  });
}
