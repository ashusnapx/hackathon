import { SITE_URL } from "@/lib/seo";

/**
 * The email someone gets when their case is saved.
 *
 * It is written to survive being forwarded to a police station or a bank: the
 * reference is the first thing on the page, the next actions are numbered, and
 * every claim about what has and has not happened is explicit. Inline styles
 * and a single column, because email clients are not browsers.
 */

export interface CaseEmailInput {
  ref: string;
  caseId: string;
  /** Without it the link opens nothing on the phone they read this on. */
  caseKey?: string;
  category?: string;
  amountInr?: number;
  financial?: boolean;
}

/**
 * The link that actually opens their case.
 *
 * The key goes in the fragment, which never leaves the browser: it is not in
 * the request line, so it reaches neither our logs nor those of whatever
 * scanner an email provider runs over the message.
 */
export function caseLink(input: CaseEmailInput): string {
  return `${SITE_URL}/case/${input.caseId}${input.caseKey ? `#k=${input.caseKey}` : ""}`;
}

const INK = "#1a1a1a";
const MUTED = "#5a5a52";
const PAPER = "#fdfcf3";
const DEEP = "#0f3d2e";
const RULE = "#e6e3d3";

export function caseCreatedSubject(input: CaseEmailInput): string {
  return `Your Kavach case ${input.ref}`;
}

export function caseCreatedText(input: CaseEmailInput): string {
  const lines = [
    `Your Kavach case reference is ${input.ref}.`,
    "",
    "Nothing has been filed with the police, a bank or any government portal.",
    "Kavach is an independent support service. It prepares your case and shows you where to take it.",
    "",
    "What to do next:",
    ...nextActions(input).map((action, index) => `${index + 1}. ${action.title} — ${action.body}`),
    "",
    `Open your case: ${caseLink(input)}`,
    "",
    "That link is the only way back into your case, and anyone who has it can read the case. Keep this email to yourself.",
    "",
    "Never share an OTP, PIN, CVV, password or full card number with anyone, including us.",
  ];
  return lines.join("\n");
}

function nextActions(input: CaseEmailInput): { title: string; body: string }[] {
  const actions: { title: string; body: string }[] = [];
  if (input.financial) {
    actions.push({
      title: "Call 1930",
      body: "The cyber-financial-fraud helpline can record the fraud and alert participating institutions. It cannot guarantee a freeze or a refund.",
    });
    actions.push({
      title: "Write to your bank",
      body: "Use a channel that gives you an acknowledgement, and keep the reference it issues.",
    });
  }
  actions.push({
    title: "File on cybercrime.gov.in",
    body: "Your case page has the description already written, inside the portal's character limits.",
  });
  actions.push({
    title: "Keep your evidence",
    body: "Messages, screenshots and transaction references. Do not delete anything, even if it seems small.",
  });
  return actions;
}

export function caseCreatedHtml(input: CaseEmailInput): string {
  const caseUrl = caseLink(input);
  const actions = nextActions(input)
    .map((action, index) => `
      <tr>
        <td style="padding:0 0 14px 0;vertical-align:top;width:26px;">
          <div style="width:22px;height:22px;border-radius:11px;background:${DEEP};color:${PAPER};font:600 12px/22px -apple-system,Segoe UI,Roboto,sans-serif;text-align:center;">${index + 1}</div>
        </td>
        <td style="padding:0 0 14px 0;">
          <div style="font:600 15px/1.4 -apple-system,Segoe UI,Roboto,sans-serif;color:${INK};">${escapeHtml(action.title)}</div>
          <div style="font:400 14px/1.55 -apple-system,Segoe UI,Roboto,sans-serif;color:${MUTED};margin-top:3px;">${escapeHtml(action.body)}</div>
        </td>
      </tr>`)
    .join("");

  const facts = [
    input.category ? ["What happened", input.category] : null,
    typeof input.amountInr === "number" && input.amountInr > 0
      ? ["Amount reported", `₹${input.amountInr.toLocaleString("en-IN")}`]
      : null,
  ].filter(Boolean) as [string, string][];

  return `<!doctype html>
<html lang="en"><body style="margin:0;padding:0;background:${PAPER};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${RULE};border-radius:14px;overflow:hidden;">

  <tr><td style="padding:22px 26px;background:${DEEP};">
    <div style="font:600 18px/1 -apple-system,Segoe UI,Roboto,sans-serif;color:${PAPER};letter-spacing:.2px;">Kavach</div>
    <div style="font:400 13px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:rgba(253,252,243,.75);margin-top:4px;">Independent cybercrime support — not police, not government</div>
  </td></tr>

  <tr><td style="padding:26px 26px 6px 26px;">
    <div style="font:400 13px/1.4 -apple-system,Segoe UI,Roboto,sans-serif;color:${MUTED};text-transform:uppercase;letter-spacing:.6px;">Your case reference</div>
    <div style="font:600 30px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;color:${INK};margin-top:6px;letter-spacing:1px;">${escapeHtml(input.ref)}</div>
    <div style="font:400 14px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;color:${MUTED};margin-top:10px;">Keep this. It is the handle for everything that follows.</div>
  </td></tr>

  ${facts.length ? `<tr><td style="padding:14px 26px 0 26px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${RULE};border-radius:10px;">
      ${facts.map(([label, value], index) => `<tr>
        <td style="padding:11px 14px;${index ? `border-top:1px solid ${RULE};` : ""}font:400 13px/1.4 -apple-system,Segoe UI,Roboto,sans-serif;color:${MUTED};">${escapeHtml(label)}</td>
        <td style="padding:11px 14px;${index ? `border-top:1px solid ${RULE};` : ""}font:600 14px/1.4 -apple-system,Segoe UI,Roboto,sans-serif;color:${INK};text-align:right;">${escapeHtml(value)}</td>
      </tr>`).join("")}
    </table>
  </td></tr>` : ""}

  <tr><td style="padding:22px 26px 0 26px;">
    <div style="font:600 15px/1.4 -apple-system,Segoe UI,Roboto,sans-serif;color:${INK};margin-bottom:14px;">What to do next</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${actions}</table>
  </td></tr>

  <tr><td style="padding:8px 26px 26px 26px;">
    <a href="${caseUrl}" style="display:inline-block;background:${INK};color:${PAPER};text-decoration:none;font:600 15px/1 -apple-system,Segoe UI,Roboto,sans-serif;padding:14px 22px;border-radius:10px;">Open your case</a>
    <div style="font:400 12px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:${MUTED};margin-top:10px;word-break:break-all;">${caseUrl}</div>
  </td></tr>

  <tr><td style="padding:18px 26px;border-top:1px solid ${RULE};background:#fbfaf2;">
    <div style="font:600 13px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:${INK};">Nothing has been filed yet.</div>
    <div style="font:400 13px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;color:${MUTED};margin-top:5px;">Kavach has prepared your case. No complaint, FIR or bank dispute exists until you submit it and receive an official acknowledgement.</div>
    <div style="font:400 13px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;color:${MUTED};margin-top:10px;">Never share an OTP, PIN, CVV, password or full card number — with anyone, including us.</div>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
