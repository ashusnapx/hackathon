import { CATEGORIES, findCategory, findSubcategory } from "@/lib/case/categories";
import type { CaseFile, Triage } from "@/lib/case/types";
import { extractAmount, extractEntities, extractIncidentTime } from "./extract";

/**
 * Everything the model does, done deterministically.
 *
 * This is not dead code for a demo — it is the degraded mode. Somebody filing at
 * 2am on a patchy connection should still walk away with a filled-in complaint
 * and a printable FIR application even if the model call times out.
 */

export function ruleTriage(text: string, now = new Date()): Triage {
  const lower = text.toLowerCase();

  let best = { catId: "other", subId: "other", score: 0 };
  for (const cat of CATEGORIES) {
    for (const sub of cat.subcategories) {
      let score = 0;
      for (const hint of sub.hints) if (lower.includes(hint)) score += hint.length > 6 ? 3 : 2;
      if (score > best.score) best = { catId: cat.id, subId: sub.id, score };
    }
  }

  const amount = extractAmount(text);
  const moneyWords = /(paisa|money|rupee|rs|₹|amount|transaction|debit|withdraw|गया|कट गए|पैसे)/i.test(text);

  // Money moved but nothing matched: financial fraud is by far the likeliest.
  if (best.score === 0 && (amount || moneyWords)) best = { catId: "financial-fraud", subId: "upi", score: 2 };

  const cat = findCategory(best.catId) ?? findCategory("other")!;
  const incidentAt = extractIncidentTime(text, now) || now.toISOString();
  const minutesSince = (now.getTime() - new Date(incidentAt).getTime()) / 60_000;

  return {
    categoryId: cat.id,
    subcategoryId: best.subId,
    // Never claim more than "fairly sure" without a model behind it.
    confidence: best.score >= 6 ? 0.72 : best.score >= 3 ? 0.55 : 0.3,
    amount,
    incidentAt,
    rationale: `Matched on keywords in your description${amount ? ` and an amount of ₹${amount.toLocaleString("en-IN")}` : ""}.`,
    applicableTracks: cat.tracks,
    urgency:
      cat.portalTrack === "financial" && minutesSince < 60
        ? "critical"
        : cat.portalTrack === "financial" && minutesSince < 1440
          ? "high"
          : "moderate",
  };
}

// ── Document templates ──────────────────────────────────────────────────────

const inr = (n?: number) => (n ? `Rs. ${n.toLocaleString("en-IN")}` : "the amount in question");

function fmtDate(iso?: string) {
  if (!iso) return "[date]";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}
function fmtDateTime(iso?: string) {
  if (!iso) return "[date and time]";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function refList(c: CaseFile): string {
  const refs = [...new Set([...c.entities.refs, ...c.txns.map((t) => t.ref).filter(Boolean)])] as string[];
  return refs.length ? refs.join(", ") : "not available";
}

function suspectLines(c: CaseFile): string {
  const s = c.suspect;
  const rows: string[] = [];
  if (s.phones.length) rows.push(`Mobile number used by suspect: ${s.phones.join(", ")}`);
  if (s.upiIds.length) rows.push(`UPI ID of suspect: ${s.upiIds.join(", ")}`);
  if (s.accounts.length) rows.push(`Bank account of suspect: ${s.accounts.join(", ")}`);
  if (s.urls.length) rows.push(`Website or link used: ${s.urls.join(", ")}`);
  if (s.handles.length) rows.push(`Social media handle: ${s.handles.join(", ")}`);
  return rows.length ? rows.join("\n") : "No suspect identifiers are available at this stage.";
}

function narrative(c: CaseFile): string {
  return (c.triage?.englishNarrative || c.rawStatement || "").trim();
}

/**
 * The NCRP description box rejects # $ @ ^ * ' ~ | ! and demands at least 200
 * characters. Getting bounced by that rule after twenty minutes of typing is
 * one of the most common ways people give up, so we enforce it here.
 */
export function sanitiseForNcrp(text: string): string {
  return text
    .replace(/[#$@^*'~|!]/g, " ")
    .replace(/[""'']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function padToMinimum(text: string, c: CaseFile, min = 220): string {
  let out = text;
  const filler = [
    c.victim.state ? `The incident is reported from ${c.victim.district ? c.victim.district + ", " : ""}${c.victim.state}.` : "",
    `I request that the matter be investigated and that the amount involved be traced and frozen at the earliest.`,
    `I am willing to provide all supporting documents and to appear before the investigating officer as required.`,
  ].filter(Boolean);
  let i = 0;
  while (out.length < min && i < filler.length) out += " " + filler[i++];
  return out.trim();
}

export function ruleNcrp(c: CaseFile): string {
  const cat = findCategory(c.triage?.categoryId);
  const sub = findSubcategory(c.triage?.categoryId, c.triage?.subcategoryId);
  const body = [
    `On ${fmtDateTime(c.incidentAt || c.triage?.incidentAt)}, I was subjected to ${sub?.label?.toLowerCase() || "a cybercrime"}${cat ? ` falling under ${cat.label.toLowerCase()}` : ""}.`,
    narrative(c),
    c.amount ? `A total of ${inr(c.amount)} was debited from my account without my authorisation.` : "",
    c.bank.name ? `The account affected is held with ${c.bank.name}${c.bank.last4 ? ` and ends with ${c.bank.last4}` : ""}.` : "",
    refList(c) !== "not available" ? `The transaction reference numbers are ${refList(c)}.` : "",
    c.suspect.phones.length ? `The suspect contacted me from ${c.suspect.phones.join(" and ")}.` : "",
    c.suspect.upiIds.length ? `The funds were received at UPI ID ${c.suspect.upiIds.join(" and ")}.` : "",
    c.suspect.accounts.length ? `The beneficiary account number is ${c.suspect.accounts.join(" and ")}.` : "",
    `I request registration of this complaint and immediate action to freeze and recover the amount.`,
  ]
    .filter(Boolean)
    .join(" ");

  return padToMinimum(sanitiseForNcrp(body), c);
}

export function ruleScript(c: CaseFile): string {
  return `WHAT TO SAY WHEN 1930 ANSWERS
Speak slowly. Give the facts in this order. Do not let them put you off with "file it online first" — insist that this is a live fraud and a freeze request is needed now.

1. WHO YOU ARE
   "My name is ${c.victim.name || "[your name]"}. My registered mobile number is ${c.victim.phone || "[your mobile]"}. I am calling to report an ongoing financial fraud."

2. WHAT HAPPENED
   "${fmtDateTime(c.incidentAt)}, ${inr(c.amount)} was debited from my ${c.bank.name || "[bank]"} account${c.bank.last4 ? ` ending ${c.bank.last4}` : ""} without my authorisation."

3. THE NUMBERS THEY NEED
   Transaction reference / UTR: ${refList(c)}
   ${c.suspect.upiIds.length ? `Beneficiary UPI ID: ${c.suspect.upiIds.join(", ")}` : ""}
   ${c.suspect.accounts.length ? `Beneficiary account: ${c.suspect.accounts.join(", ")}` : ""}
   ${c.suspect.phones.length ? `Number the fraudster called from: ${c.suspect.phones.join(", ")}` : ""}

4. WHAT TO ASK FOR, IN THESE WORDS
   "Please raise a freeze request with the beneficiary bank immediately and give me the acknowledgement number for this call."

5. WRITE DOWN BEFORE YOU HANG UP
   Acknowledgement number: ______________________
   Name of the person you spoke to: ______________________
   Time of call: ______________________

IF THEY ASK FOR ANYTHING SUSPICIOUS
No genuine 1930 operator will ever ask for your OTP, your card PIN, your CVV, your internet banking password, or ask you to install any app. If they do, hang up — you are being defrauded a second time.`.replace(/\n\s+\n/g, "\n\n");
}

export function ruleBankLetter(c: CaseFile): string {
  const today = fmtDate(new Date().toISOString());
  return `To,
The Branch Manager
${c.bank.name || "[Name of your bank]"}
[Branch address]

Copy to: The Nodal Officer / Principal Nodal Officer, ${c.bank.name || "[bank]"}

Date: ${today}

Subject: Notification of unauthorised electronic banking transaction and request for
         reversal under the Reserve Bank of India circular on limiting the liability
         of customers in unauthorised electronic banking transactions

Sir / Madam,

1. I, ${c.victim.name || "[your full name]"}, hold a savings account with your branch${c.bank.last4 ? ` bearing the last four digits ${c.bank.last4}` : ""}. My registered mobile number is ${c.victim.phone || "[your mobile]"}${c.victim.email ? ` and my registered email is ${c.victim.email}` : ""}.

2. On ${fmtDateTime(c.incidentAt)}, ${inr(c.amount)} was debited from the said account in a transaction that I did not authorise, did not initiate, and had no knowledge of until the debit message reached me.

3. The circumstances are as follows:
   ${narrative(c) || "[describe what happened]"}

4. The particulars of the disputed transaction are:
   Amount: ${inr(c.amount)}
   Date and time: ${fmtDateTime(c.incidentAt)}
   Transaction reference / UTR: ${refList(c)}
${c.suspect.accounts.length ? `   Beneficiary account: ${c.suspect.accounts.join(", ")}\n` : ""}${c.suspect.upiIds.length ? `   Beneficiary UPI ID: ${c.suspect.upiIds.join(", ")}\n` : ""}
5. This is a third party breach in which the deficiency lies neither with me nor in my custody of credentials. I am giving you this notification in writing within three working days of receiving the communication regarding the transaction. In terms of the Reserve Bank of India circular on limiting the liability of customers in unauthorised electronic banking transactions, my liability in these circumstances is nil.

6. I accordingly call upon the bank to:
   a. reverse the disputed amount of ${inr(c.amount)} and credit it to my account within ten working days of this notification, as required by the said circular;
   b. raise a freeze and lien request with the beneficiary bank forthwith;
   c. share with me the transaction trail and beneficiary details to the extent permissible, for production before the police;
   d. record this letter as a formal complaint and issue me a written acknowledgement bearing a complaint number and today's date.

7. I have also reported this matter on the National Cyber Crime Reporting Portal${c.docs?.ncrp ? "" : ""} and to the helpline 1930.

8. Please note that if the matter is not resolved within ninety days I shall be constrained to approach the Reserve Bank of India Ombudsman under the Reserve Bank Integrated Ombudsman Scheme, and to seek compensation for the delay.

Enclosures: bank statement showing the disputed entry, screenshots of the fraudulent communication, copy of the acknowledgement generated on the National Cyber Crime Reporting Portal.

Yours faithfully,

${c.victim.name || "[your full name]"}
${c.victim.address || "[your address]"}
Mobile: ${c.victim.phone || "[your mobile]"}
${c.victim.email ? `Email: ${c.victim.email}` : ""}

ACKNOWLEDGEMENT (to be filled and returned by the bank)
Received on ______________ by ______________________ (name and designation)
Complaint number: ______________________     Branch seal:`;
}

export function ruleFir(c: CaseFile): string {
  const cat = findCategory(c.triage?.categoryId);
  const financial = cat?.portalTrack === "financial";
  const sections = financial
    ? "Sections 66C and 66D of the Information Technology Act, 2000 and Section 318 of the Bharatiya Nyaya Sanhita, 2023"
    : "the relevant provisions of the Information Technology Act, 2000 and the Bharatiya Nyaya Sanhita, 2023";

  return `To,
The Station House Officer
${c.victim.district ? `${c.victim.district} ` : ""}Police Station / Cyber Crime Police Station
${c.victim.district ? `${c.victim.district}, ` : ""}${c.victim.state || "[State]"}

Date: ${fmtDate(new Date().toISOString())}

Subject: Application for registration of a First Information Report in respect of
         a cognizable offence of cyber fraud

Sir / Madam,

I, ${c.victim.name || "[your full name]"}, aged ___ years, resident of ${c.victim.address || "[your address]"}, respectfully submit as follows.

1. On ${fmtDateTime(c.incidentAt)} I was the victim of ${findSubcategory(c.triage?.categoryId, c.triage?.subcategoryId)?.label?.toLowerCase() || "a cybercrime"}.

2. The facts are these:
   ${narrative(c) || "[describe what happened, in order]"}

${financial ? `3. As a consequence, ${inr(c.amount)} was fraudulently transferred out of my account${c.bank.name ? ` held with ${c.bank.name}` : ""}${c.bank.last4 ? ` ending ${c.bank.last4}` : ""}. The transaction reference numbers are ${refList(c)}.\n` : "3. As a consequence I have suffered the harm described above.\n"}
4. The particulars of the suspect available to me are:
${suspectLines(c)
  .split("\n")
  .map((l) => "   " + l)
  .join("\n")}

5. I have reported the matter on the National Cyber Crime Reporting Portal and on the helpline 1930. I am given to understand that a complaint registered on the portal is not a First Information Report, and I am therefore approaching this station for registration of an FIR.

6. The acts described disclose a cognizable offence punishable under ${sections}. In terms of Section 173 of the Bharatiya Nagarik Suraksha Sanhita, 2023, this station is obliged to register a First Information Report on receipt of information disclosing a cognizable offence. If the offence is found to have been committed outside the territorial jurisdiction of this station, I request that a Zero FIR be registered and transferred to the station having jurisdiction.

7. I therefore pray that this Hon'ble office be pleased to:
   a. register a First Information Report on the basis of this application;
   b. issue me a free copy of the First Information Report as required by law;
   c. cause an investigation to be made and the amount involved to be traced, frozen and restored to me;
   d. furnish me with the name and contact details of the Investigating Officer.

I undertake to produce all documents and to render every assistance in the investigation. The facts stated above are true to the best of my knowledge and belief.

Enclosures:
   1. Copy of the acknowledgement generated on the National Cyber Crime Reporting Portal
   2. Bank statement showing the disputed entries
   3. Screenshots of the fraudulent calls, messages or web pages
   4. Copy of my identity proof
${c.files.length ? c.files.map((f, i) => `   ${i + 5}. ${f.name}`).join("\n") : ""}

Yours faithfully,

(${c.victim.name || "[your full name]"})
Mobile: ${c.victim.phone || "[your mobile]"}
${c.victim.email ? `Email: ${c.victim.email}` : ""}

FOR OFFICE USE
Received on ______________ at ______________ hrs
Received by ______________________  Diary / FIR number ______________________`;
}

export function ruleChakshu(c: CaseFile): string {
  return `CHAKSHU REPORT — sancharsaathi.gov.in

Chakshu is run by the Department of Telecommunications and is separate from the
police complaint. Reporting the number here gets the connection disconnected and
the handset blacklisted, which protects whoever the same fraudster calls next.

Category to select: ${findCategory(c.triage?.categoryId)?.portalTrack === "financial" ? "Fraud in the name of KYC / bank / payment" : "Impersonation or other suspected fraud communication"}

Medium: ${c.entities.apps.includes("whatsapp") ? "WhatsApp" : c.suspect.phones.length ? "Call or SMS" : "Select what applies"}

Number to report: ${c.suspect.phones.join(", ") || "[the number that contacted you]"}

Date and time received: ${fmtDateTime(c.incidentAt)}

What to write in the description box:
${sanitiseForNcrp(
  `I received a fraudulent communication from the above number on ${fmtDateTime(c.incidentAt)}. ${narrative(c)} ${c.amount ? `An amount of ${inr(c.amount)} was fraudulently taken from me as a result.` : ""} I have also filed a complaint on the National Cyber Crime Reporting Portal.`,
)}

Attach: a screenshot of the call log or the message.`;
}

export function ruleMrm(c: CaseFile): string {
  const officer = c.victim.district ? `${c.victim.district} Cyber Police Station` : "[your police station]";
  return `MONEY RESTORATION REQUEST — mrm-ncrp.mha.gov.in

A freeze is not a refund. This is the step that turns money stopped in the
fraudster's account into money back in yours.

WAIT FOR THE SMS FIRST
Your bank has to examine what it put on hold and tell the portal how much is
actually recoverable. When it does, you get an SMS and an email carrying a date.
Applying before that date will not work.

WHAT THE PORTAL ASKS FOR, IN ORDER
   NCRP acknowledgement number   [your 14-digit number from cybercrime.gov.in]
   Mobile for the OTP            ${c.victim.phone || "[your registered mobile]"}
   Account to be credited        ${c.bank.name || "[bank]"}${c.bank.last4 ? `, ending ${c.bank.last4}` : ""}
                                 [account number]  [IFSC]
   PAN                           [your PAN, copied from the card — do not
                                 write it down anywhere else]
   Court order                   [only if you already have one]

You will also sign an undertaking to produce the amount before the court if it
is later directed. Read it before you sign it.

When you submit, the portal gives you a 14-digit number beginning MR. Write it
here and keep it:  MR __________________

THE Rs. 50,000 LINE
   Below Rs. 50,000 held in any one account — no FIR and no court order needed.
   Above Rs. 50,000 held in one account — an FIR is mandatory before the money
   can be released. This is the practical reason to get the FIR registered.

WHAT HAPPENS NEXT
Your request goes to ${officer}
for the Investigating Officer to verify. If the officer is satisfied the money is
yours, they pass an order and the bank has fifteen calendar days to credit it. Where several victims paid into the same
account and the money cannot be told apart, it is shared out in proportion.

NOTE FOR THE INVESTIGATING OFFICER
(print this, sign it, and hand it in with your FIR papers)

   Sir / Madam,

   I, ${c.victim.name || "[your full name]"}, mobile ${c.victim.phone || "[your mobile]"}, am the complainant in the
   above matter, in which ${inr(c.amount)} was fraudulently taken from my account
   on ${fmtDateTime(c.incidentAt)}${refList(c) !== "not available" ? ` (transaction reference ${refList(c)})` : ""}.

   I am informed that a part of the said amount stands held in the beneficiary
   account${c.suspect.accounts.length ? ` ${c.suspect.accounts.join(", ")}` : ""}. I have raised a restoration request on the Money Restoration
   Module of the National Cyber Crime Reporting Portal.

   I respectfully request that the held amount be ordered to be released to me
   under Section 106(3) of the Bharatiya Nagarik Suraksha Sanhita, 2023. I
   undertake to produce the said amount before the Hon'ble Court as and when
   directed, and to abide by any further orders of the Court.

   ${c.victim.name || "[your full name]"}
   ${c.victim.address || "[your address]"}
   Date: ${fmtDate(new Date().toISOString())}

Nothing here guarantees a refund. Money the fraudster has already withdrawn
cannot be restored through this route.`;
}

export function ruleOmbudsman(c: CaseFile): string {
  return `COMPLAINT TO THE RESERVE BANK OF INDIA OMBUDSMAN
Filed online at cms.rbi.org.in under the Reserve Bank Integrated Ombudsman Scheme

Only file this after thirty days have passed since you complained to your bank,
or after the bank has rejected your complaint, whichever is earlier.

Complainant: ${c.victim.name || "[your full name]"}
Address: ${c.victim.address || "[your address]"}
Mobile: ${c.victim.phone || "[your mobile]"}${c.victim.email ? `\nEmail: ${c.victim.email}` : ""}

Bank complained against: ${c.bank.name || "[bank]"}
Account: ${c.bank.last4 ? `ending ${c.bank.last4}` : "[account]"}
Complaint made to the bank on: ${c.bank.notifiedAt ? fmtDate(c.bank.notifiedAt) : "[date]"}
Bank's complaint reference: ${c.bank.ackRef || "[acknowledgement number]"}

Nature of complaint: Non-reversal of an unauthorised electronic banking transaction
and failure to comply with the Reserve Bank of India circular limiting customer
liability.

Facts:
1. On ${fmtDateTime(c.incidentAt)}, ${inr(c.amount)} was debited from my account without my authorisation, in a third party breach.
2. I notified the bank in writing on ${c.bank.notifiedAt ? fmtDate(c.bank.notifiedAt) : "[date]"}, within three working days of receiving the transaction communication, and obtained acknowledgement ${c.bank.ackRef || "[number]"}.
3. In terms of the said circular my liability is nil and the bank was required to credit the disputed amount to my account within ten working days of my notification.
4. The bank has neither credited the amount nor communicated any finding fixing my liability. More than thirty days have elapsed since my complaint.
5. I have separately reported the matter on the National Cyber Crime Reporting Portal and to the helpline 1930.

Relief sought:
   a. Credit of ${inr(c.amount)} to my account;
   b. Compensation for the delay in resolution as provided under the circular;
   c. Such other relief as the Ombudsman considers just.

Documents to upload:
   1. The letter sent to the bank and its acknowledgement
   2. Bank statement showing the disputed debit
   3. Acknowledgement from the National Cyber Crime Reporting Portal
   4. Any reply received from the bank`;
}

export function ruleDocs(c: CaseFile) {
  return {
    ncrp: ruleNcrp(c),
    script: ruleScript(c),
    bank: ruleBankLetter(c),
    fir: ruleFir(c),
    chakshu: ruleChakshu(c),
    mrm: ruleMrm(c),
    ombudsman: ruleOmbudsman(c),
  };
}
