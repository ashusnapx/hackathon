import { caseLink, emailShell, escapeHtml } from "./case-created";

/**
 * The email that says a date has arrived.
 *
 * This is the only message Kavach sends that the person did not ask for at the
 * moment it lands, so it is held to a stricter rule than the rest: it says one
 * thing, names the one step, and links to the one screen. If it cannot say
 * which step and why today, it is not sent.
 *
 * Three things it will not do:
 *
 *  · It never claims anything was filed. The subject and the first line both
 *    say the step is theirs to take, because a reminder that reads like a
 *    status update is how somebody concludes it has been handled.
 *  · It never says a deadline is legally fatal unless it is. Most of these
 *    dates are urgency; two of them close a route. The copy differs.
 *  · It carries no case detail beyond the reference. Email is not a channel
 *    this product controls: it is forwarded, printed, read on a shared phone,
 *    and left open. The link goes to the case; the case is where the facts are.
 */

export interface ReminderInput {
  ref: string;
  caseId: string;
  /** What to do, already translated. */
  step: string;
  /** When it falls due, as the person should read it. */
  due: string;
  /**
   * True when missing this date closes the route rather than merely delaying
   * it. Only the Ombudsman limitation period and the bank's liability windows
   * qualify; everything else is urgency, and saying otherwise is a lie that
   * costs trust the first time somebody checks.
   */
  closing?: boolean;
}

export function reminderSubject(input: ReminderInput): string {
  return input.closing
    ? `Today is the last day — ${input.ref}`
    : `Today: ${input.step} — ${input.ref}`;
}

export function reminderText(input: ReminderInput): string {
  const lines = [
    input.closing
      ? "This is the last day for one of the steps in your case."
      : "One of the steps in your case falls due today.",
    "",
    input.step,
    `Due: ${input.due}`,
    "",
    "Open your case for what to say and the papers already written for you:",
    caseLink({ ref: input.ref, caseId: input.caseId }),
    "",
    "Nothing has been filed for you. This step is yours to take.",
    "",
    "If you have already done it, mark it done in your case and we will stop reminding you about it.",
  ];
  return [
    ...lines,
    "",
    `Case reference: ${input.ref}`,
    "Kavach — independent cybercrime support. Not police, not government.",
  ].join("\n");
}

export function reminderHtml(input: ReminderInput): string {
  const step = escapeHtml(input.step);
  const due = escapeHtml(input.due);
  const url = caseLink({ ref: input.ref, caseId: input.caseId });

  return emailShell({
    subject: reminderSubject(input),
    preheader: input.closing ? `Last day: ${input.step}` : `Due today: ${input.step}`,
    body: `
      <tr><td class="k-pad" style="padding:26px 26px 0 26px;">
      <p style="margin:0 0 18px;font-size:17px;line-height:1.5;color:#1a1a1a">
        ${input.closing
          ? "This is the <strong>last day</strong> for one of the steps in your case."
          : "One of the steps in your case <strong>falls due today</strong>."}
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 22px">
        <tr>
          <td style="border:1px solid #1a1a1a26;border-radius:12px;padding:18px 20px;background:#fffff5">
            <p style="margin:0;font-size:19px;line-height:1.35;color:#1a1a1a;font-weight:600">${step}</p>
            <p style="margin:8px 0 0;font-size:14px;line-height:1.5;color:#7a7a72">Due: ${due}</p>
          </td>
        </tr>
      </table>

      <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 22px">
        <tr>
          <td style="border-radius:10px;background:#034f46">
            <a href="${url}" style="display:inline-block;padding:13px 22px;font-size:16px;font-weight:600;color:#ffffeb;text-decoration:none">
              Open your case
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#4a4a44">
        The words to say and the papers you need are already written inside.
      </p>
      <p style="margin:0;font-size:15px;line-height:1.6;color:#4a4a44">
        <strong>Nothing has been filed for you.</strong> This step is yours to take.
        If you have already done it, mark it done in your case and we will stop
        reminding you about it.
      </p>
      </td></tr>
    `,
  });
}
