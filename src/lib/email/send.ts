import "server-only";

import nodemailer from "nodemailer";
import {
  caseCreatedHtml,
  caseCreatedSubject,
  caseCreatedText,
  type CaseEmailInput,
} from "./case-created";

/**
 * Outbound email over Gmail's SMTP.
 *
 * Gmail with an App Password is free and needs no domain, which is what this
 * project has. It is also rate-limited and meant for a person rather than a
 * service, so this is honest about being a prototype path: a real deployment
 * should move to a transactional provider, and only the transport below changes
 * when it does.
 *
 * With no credentials configured it does nothing and says so, rather than
 * failing a case that was saved perfectly well.
 */

export type EmailResult =
  | { sent: true }
  | { sent: false; reason: "not-configured" | "send-failed" };

export function emailConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.GMAIL_USER?.trim() && env.GMAIL_APP_PASSWORD?.trim());
}

export async function sendCaseCreatedEmail(to: string, input: CaseEmailInput): Promise<EmailResult> {
  if (!emailConfigured()) return { sent: false, reason: "not-configured" };

  const user = process.env.GMAIL_USER!.trim();
  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user, pass: process.env.GMAIL_APP_PASSWORD!.trim() },
  });

  try {
    await transport.sendMail({
      from: `Kavach <${user}>`,
      to,
      subject: caseCreatedSubject(input),
      text: caseCreatedText(input),
      html: caseCreatedHtml(input),
    });
    return { sent: true };
  } catch (error) {
    // The address, the reference and anything else about the case stay out of
    // the log: a delivery failure is an operations problem, not a case record.
    console.error("case email not sent", { reason: error instanceof Error ? error.name : "unknown" });
    return { sent: false, reason: "send-failed" };
  }
}
