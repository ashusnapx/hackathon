import { caseKeyHash } from "@/lib/case/key";
import { daysLeftFor } from "@/lib/case/days-left";
import { liveTracks } from "@/lib/case/tracks";
import type { CaseFile } from "@/lib/case/types";
import { readCaseRow } from "@/lib/db/cases";
import { everyOwnedCase } from "@/lib/db/case-owners";
import { claimEmailSend, releaseEmailSend, reminderKind } from "@/lib/db/email-sends";
import { emailConfigured, sendReminderEmail } from "@/lib/email/send";
import { en } from "@/lib/i18n/dict/en";
import { json } from "@/lib/integrations/vaani-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The morning a step falls due, tell the person whose step it is.
 *
 * This is the half of the promise the case-created email makes. Several of the
 * ten steps only open weeks out and two of them close for good, and nobody in
 * the first hour of a fraud is holding that calendar in their head.
 *
 * It can only work because a signed-in case is attached to the account with its
 * key — see migration 0003 — so the server can read the case it is reminding
 * somebody about. A case that was never signed in is never read here and never
 * emailed, which is the honest consequence of that design: no account, no
 * server-side copy, no reminder.
 *
 * Three rules, all of them about not becoming a nuisance:
 *
 *  · One email per step per case. A step that is due today and still due
 *    tomorrow does not send twice: the right to send it is claimed in
 *    `public.email_sends` before the message leaves, and a claim is only given
 *    back when delivery fails.
 *  · Nothing is sent for a step already marked done, or one that does not
 *    apply to this case.
 *  · A step with no date never triggers anything. Most of the ten are urgent
 *    without being time-barred, and inventing a due date to have something to
 *    send would be the worst possible use of somebody's trust.
 */

/** English only for now: the account's language is not stored server-side. */
const dict = en;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  // Refuse rather than run open. This route reads cases and sends mail; an
  // unauthenticated trigger is a way to make Kavach mail its own users on
  // demand.
  if (!secret) return json({ error: "cron-secret-missing" }, 503);
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return json({ error: "unauthorised" }, 401);
  }
  if (!emailConfigured()) return json({ sent: 0, reason: "email-not-configured" }, 200);

  const owned = await everyOwnedCase();
  let sent = 0;
  let skipped = 0;

  for (const row of owned) {
    try {
      const stored = await readCaseRow(row.caseId, await caseKeyHash(row.caseKey));
      if (!stored) { skipped += 1; continue; }

      const caseFile = stored.data as CaseFile;
      if (!caseFile?.ref || !Array.isArray(caseFile.tracks)) { skipped += 1; continue; }

      const due = liveTracks(caseFile).find((track) => {
        if (track.state === "done" || track.state === "na") return false;
        const left = daysLeftFor(track);
        // Today, or already past and not yet chased. "Past" matters: a person
        // who missed a date needs to hear it more than one who has not.
        return left !== null && left.days <= 0;
      });
      if (!due) { skipped += 1; continue; }

      /*
       * One per step, ever.
       *
       * This used to be a `remindedAt` stamp written back into the case
       * document, which could not work: the browser is the author of that
       * document and has never heard of the field, so the next edit somebody
       * made pushed a copy without it and erased the record — and this job,
       * finding no stamp the following night, sent the same reminder again.
       *
       * The claim now lives in a table nothing else writes. It is taken before
       * the send and given back if the send fails, so a refused SMTP
       * connection costs a night rather than the message.
       *
       * The old stamp is still read, and only read. It suppresses a single
       * duplicate for any case that was stamped before this change; nothing
       * writes it now, and it can go once those cases have run their course.
       */
      if (caseFile.remindedAt?.[due.def.id]) { skipped += 1; continue; }

      const kind = reminderKind(due.def.id);
      if (!(await claimEmailSend(row.caseId, kind, row.email))) { skipped += 1; continue; }

      const result = await sendReminderEmail(row.email, {
        ref: caseFile.ref,
        caseId: row.caseId,
        step: dict[due.def.titleKey] ?? due.def.id,
        due: dict[due.def.dueKey] ?? "",
        // Only these two actually close a route; the rest are urgency, and
        // saying otherwise is a lie the first person to check will find.
        closing: due.def.id === "ombudsman" || due.def.id === "bank-notice",
      });

      if (result.sent) sent += 1;
      else await releaseEmailSend(row.caseId, kind);
    } catch {
      // One unreadable case must not stop the rest of the run.
      skipped += 1;
    }
  }

  return json({ sent, skipped, considered: owned.length }, 200);
}
