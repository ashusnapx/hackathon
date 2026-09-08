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
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";

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
        <td class="k-num" style="padding:0 0 16px 0;vertical-align:top;width:30px;">
          <div style="width:24px;height:24px;border-radius:12px;background:${DEEP};color:${PAPER};font:700 12px/24px ${FONT};text-align:center;">${index + 1}</div>
        </td>
        <td style="padding:0 0 16px 0;">
          <div style="font:600 15px/1.4 ${FONT};color:${INK};">${escapeHtml(action.title)}</div>
          <div style="font:400 14px/1.6 ${FONT};color:${MUTED};margin-top:4px;">${escapeHtml(action.body)}</div>
        </td>
      </tr>`)
    .join("");

  const facts = [
    input.category ? ["What happened", input.category] : null,
    typeof input.amountInr === "number" && input.amountInr > 0
      ? ["Amount reported", `\u20B9${input.amountInr.toLocaleString("en-IN")}`]
      : null,
  ].filter(Boolean) as [string, string][];

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(caseCreatedSubject(input))}</title>
<style>
  /* Clients that support media queries get a phone layout. Everything below is
     a progressive improvement on a table that already works without any of it —
     Gmail strips much of this, and the message has to read correctly stripped. */
  @media only screen and (max-width:600px) {
    .k-pad { padding-left:18px !important; padding-right:18px !important; }
    .k-ref { font-size:26px !important; letter-spacing:.5px !important; }
    .k-cta { display:block !important; width:100% !important; text-align:center !important; box-sizing:border-box !important; }
    .k-fact { display:block !important; width:100% !important; text-align:left !important; padding-bottom:0 !important; }
    .k-fact-v { padding-top:2px !important; padding-bottom:11px !important; }
    .k-card { border-radius:0 !important; border-left:0 !important; border-right:0 !important; }
    .k-outer { padding:0 !important; }
  }
  /* Dark mode: only the surfaces move. The deep header and the ink button are
     already dark, and inverting them would flatten the whole message. */
  @media (prefers-color-scheme: dark) {
    .k-body { background:#14140f !important; }
    .k-card { background:#1c1c17 !important; border-color:#33332b !important; }
    .k-ink { color:#f5f4e8 !important; }
    .k-muted { color:#a8a89c !important; }
    .k-soft { background:#22221b !important; }
    .k-rule { border-color:#33332b !important; }
    .k-cta { background:#f5f4e8 !important; color:#14140f !important; }
  }
  a { color:inherit; }
</style>
</head>
<body class="k-body" style="margin:0;padding:0;background:${PAPER};-webkit-text-size-adjust:100%;">
<!-- Preheader: the grey line a phone shows next to the subject. Without one,
     clients pull the first visible words, which here would be the disclaimer. -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your case reference is ${escapeHtml(input.ref)}. Nothing has been filed yet \u2014 here is what to do next.</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="k-body" style="background:${PAPER};">
<tr><td class="k-outer" align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="k-card k-rule" style="max-width:560px;background:#ffffff;border:1px solid ${RULE};border-radius:14px;overflow:hidden;">

  <tr><td class="k-pad" style="padding:22px 26px;background:${DEEP};">
    <div style="font:700 18px/1 ${FONT};color:${PAPER};letter-spacing:.2px;">Kavach</div>
    <div style="font:400 13px/1.5 ${FONT};color:rgba(253,252,243,.78);margin-top:5px;">Independent cybercrime support \u2014 not police, not government</div>
  </td></tr>

  <tr><td class="k-pad" style="padding:26px 26px 6px 26px;">
    <div class="k-muted" style="font:600 12px/1.4 ${FONT};color:${MUTED};text-transform:uppercase;letter-spacing:.7px;">Your case reference</div>
    <div class="k-ref k-ink" style="font:700 30px/1.2 ${MONO};color:${INK};margin-top:8px;letter-spacing:1px;word-break:break-all;">${escapeHtml(input.ref)}</div>
    <div class="k-muted" style="font:400 14px/1.6 ${FONT};color:${MUTED};margin-top:10px;">Keep this. It is the handle for everything that follows.</div>
  </td></tr>

  ${facts.length ? `<tr><td class="k-pad" style="padding:16px 26px 0 26px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="k-rule" style="border:1px solid ${RULE};border-radius:10px;">
      ${facts.map(([label, value], index) => `<tr>
        <td class="k-fact k-muted k-rule" style="padding:11px 14px;${index ? `border-top:1px solid ${RULE};` : ""}font:400 13px/1.4 ${FONT};color:${MUTED};">${escapeHtml(label)}</td>
        <td class="k-fact k-fact-v k-ink k-rule" style="padding:11px 14px;${index ? `border-top:1px solid ${RULE};` : ""}font:600 14px/1.4 ${FONT};color:${INK};text-align:right;">${escapeHtml(value)}</td>
      </tr>`).join("")}
    </table>
  </td></tr>` : ""}

  <tr><td class="k-pad" style="padding:24px 26px 0 26px;">
    <div class="k-ink" style="font:600 15px/1.4 ${FONT};color:${INK};margin-bottom:14px;">What to do next</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${actions}</table>
  </td></tr>

  <tr><td class="k-pad" style="padding:8px 26px 26px 26px;">
    <a href="${caseUrl}" class="k-cta" style="display:inline-block;background:${INK};color:${PAPER};text-decoration:none;font:600 15px/1 ${FONT};padding:15px 24px;border-radius:10px;">Open your case</a>
    <div class="k-muted" style="font:400 12px/1.5 ${FONT};color:${MUTED};margin-top:12px;word-break:break-all;">${caseUrl}</div>
    <div class="k-muted" style="font:400 12px/1.6 ${FONT};color:${MUTED};margin-top:10px;">That link is the only way back into your case, and anyone who has it can read it. Keep this email to yourself.</div>
  </td></tr>

  <tr><td class="k-pad k-soft k-rule" style="padding:18px 26px;border-top:1px solid ${RULE};background:#fbfaf2;">
    <div class="k-ink" style="font:600 13px/1.5 ${FONT};color:${INK};">Nothing has been filed yet.</div>
    <div class="k-muted" style="font:400 13px/1.6 ${FONT};color:${MUTED};margin-top:6px;">Kavach has prepared your case. No complaint, FIR or bank dispute exists until you submit it and receive an official acknowledgement.</div>
    <div class="k-muted" style="font:400 13px/1.6 ${FONT};color:${MUTED};margin-top:10px;">Never share an OTP, PIN, CVV, password or full card number \u2014 with anyone, including us.</div>
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
