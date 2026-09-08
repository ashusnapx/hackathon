import { database, databaseConfigured } from "./supabase";

/**
 * Whether an email has already gone out, answered by the database.
 *
 * See `supabase/migrations/0006_email_sends.sql` for the two duplicate-mail
 * bugs this replaces. The short version: both guards lived somewhere that was
 * routinely overwritten — one in a browser's local storage, one inside the case
 * document the browser itself rewrites — so both emails repeated.
 *
 * The shape to copy when adding a third kind of message:
 *
 *     if (!(await claimEmailSend(id, kind, to))) return;   // somebody sent it
 *     const result = await send(...);
 *     if (!result.sent) await releaseEmailSend(id, kind);  // so it can retry
 *
 * Claiming before sending rather than recording after is what makes two tabs
 * safe: they race on the primary key and one of them loses. The cost is that a
 * crash between the claim and the send loses that message, which is the right
 * way round — one missed reminder beats a mailbox filling up with the same one.
 */

/** `case-created`, or `reminder:<track id>`. */
export type EmailKind = string;

export function reminderKind(trackId: string): EmailKind {
  return `reminder:${trackId}`;
}

/**
 * Take the right to send this email, or report that somebody already has.
 *
 * Failure is deliberately open: with no database configured, or with the
 * database refusing, this says yes and the mail goes out. A person whose money
 * left an hour ago and never receives their case reference is worse off than
 * one who receives it twice, and the sender's own local record still stops the
 * ordinary repeat on that device.
 */
export async function claimEmailSend(
  caseId: string,
  kind: EmailKind,
  toEmail: string,
): Promise<boolean> {
  if (!databaseConfigured()) return true;

  try {
    // `ignoreDuplicates` makes this ON CONFLICT DO NOTHING, and the select
    // returns only rows that were actually inserted — so an empty result is
    // precisely "somebody else holds this claim".
    const { data, error } = await database()
      .from("email_sends")
      .upsert(
        { case_id: caseId, kind, to_email: toEmail },
        { onConflict: "case_id,kind", ignoreDuplicates: true },
      )
      .select("kind");

    if (error) throw new Error(error.message);
    return (data?.length ?? 0) > 0;
  } catch (error) {
    // The address and the case id stay out of the log: a claim that could not
    // be recorded is an operations problem, not a case record.
    console.error("email claim failed", {
      kind,
      reason: error instanceof Error ? error.message : "unknown",
    });
    return true;
  }
}

/**
 * Give a claim back after a send that did not happen.
 *
 * Without this, one refused SMTP connection would silence that message for that
 * case permanently — the claim would sit there recording a delivery that never
 * occurred.
 */
export async function releaseEmailSend(caseId: string, kind: EmailKind): Promise<void> {
  if (!databaseConfigured()) return;
  try {
    await database().from("email_sends").delete().eq("case_id", caseId).eq("kind", kind);
  } catch {
    // Nothing useful to do. The message is lost for this case either way, and
    // failing the request would only hide the delivery failure behind a second
    // one.
  }
}

/**
 * Forget every email sent about a case.
 *
 * Called when the case is deleted. `public.cases` takes deletion literally —
 * see `deleteCaseRow` — and this table holds an address alongside a case id, so
 * leaving the rows behind would make "forget this case" untrue in exactly the
 * way somebody asking for it would mind.
 */
export async function forgetEmailSends(caseId: string): Promise<void> {
  if (!databaseConfigured()) return;
  try {
    await database().from("email_sends").delete().eq("case_id", caseId);
  } catch {
    // The case row itself is already gone, which is the part that matters.
  }
}
