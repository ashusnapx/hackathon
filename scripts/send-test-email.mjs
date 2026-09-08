/**
 * Send one real case email, rendered by the real template.
 *
 * Not a unit test and not a mock: it imports `case-created.ts` through tsx so
 * the message that lands in an inbox is byte-for-byte what a citizen gets, and
 * it goes out over the same Gmail transport the app uses. That combination is
 * the only way to catch the things that only break in a mail client — a media
 * query Gmail strips, a dark-mode rule that inverts the wrong half, a button
 * that stops being tappable at 320px.
 *
 *   npx tsx scripts/send-test-email.mjs you@example.com
 */

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, existsSync } from "node:fs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

for (const file of [".env.local", ".env"]) {
  const path = resolve(ROOT, file);
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

const to = process.argv[2];
if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)) {
  console.error("Usage: npx tsx scripts/send-test-email.mjs you@example.com");
  process.exit(1);
}

// The template and the credential reader are imported from the app. `send.ts`
// is not: it is marked `server-only`, a guard meant for the Next build, and
// pulling it in here would fail for a reason that has nothing to do with email.
// The transport below is the same four lines that module builds.
const { caseCreatedHtml, caseCreatedSubject, caseCreatedText } =
  await import("../src/lib/email/case-created.ts");
const { emailConfigured, emailUser, emailAppPassword } =
  await import("../src/lib/email/config.ts");
const { default: nodemailer } = await import("nodemailer");

/**
 * The sample case, as the app would describe it.
 *
 * The reference and id are shaped to match what the route accepts, because a
 * test message that skips the validation the real path applies is a test of
 * nothing.
 */
const input = {
  ref: "KVC-DEMO-CALL",
  caseId: "demo-vaani-call",
  caseKey: undefined,
  category: "Online financial fraud — card fraud",
  amountInr: 10_000,
  financial: true,
};

console.log("from:      ", emailUser());
console.log("configured:", emailConfigured());
console.log("to:        ", to);
console.log("subject:   ", caseCreatedSubject(input));
console.log("html bytes:", caseCreatedHtml(input).length);
console.log("text lines:", caseCreatedText(input).split("\n").length);

const smtp = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: { user: emailUser(), pass: emailAppPassword() },
});

try {
  const info = await smtp.sendMail({
    from: `Kavach <${emailUser()}>`,
    to,
    subject: caseCreatedSubject(input),
    text: caseCreatedText(input),
    html: caseCreatedHtml(input),
  });
  console.log("sent:      ", info.messageId);
  console.log("accepted:  ", info.accepted.join(", "));
} catch (error) {
  console.error("FAILED:    ", error.message);
  process.exitCode = 1;
} finally {
  smtp.close();
}
